"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, FileText, Layers, Mail, Network, Save, Search, Sparkles, Target, Upload, UserRound, UsersRound, X } from "lucide-react";

import { ActiveCampaignSummary } from "@/components/dashboard/active-campaign-summary";
import { AllContactsWindow } from "@/components/dashboard/all-contacts-window";
import { DataImportPanel } from "@/components/dashboard/data-import-panel";
import { DashboardHistory, type SavedDashboardSnapshot } from "@/components/dashboard/dashboard-history";
import { DailyFocusQueue } from "@/components/dashboard/daily-focus-queue";
import { GmailSyncPanel } from "@/components/dashboard/gmail-sync-panel";
import { RelationshipHealthOverview } from "@/components/dashboard/relationship-health-overview";
import { CampaignWorkspace } from "@/components/campaigns/campaign-workspace";
import { PersonDetailPanel } from "@/components/people/person-detail-panel";
import { RelationshipMap } from "@/components/relationship-map/relationship-map";
import type {
  CampaignInsight,
  DailyRecommendation,
  FounderProfile,
  PersonInsight,
  RelationshipPod,
} from "@/lib/data/types";
import {
  buildCampaignRelationshipState,
  buildManualCampaign,
  type ManualCampaignInput,
} from "@/lib/campaigns/manual-campaigns";
import { buildImportedRelationshipState } from "@/lib/import/relationship-import-adapter";
import { buildEmailEnrichedRelationshipState } from "@/lib/email/relationship-email-sync";
import { cn } from "@/lib/utils/classnames";
import { DEFAULT_APP_TIME_ZONE, formatLongDate, hasAppDateChanged } from "@/lib/utils/dates";
import type { ImportResult } from "@/lib/import/types";
import type { EmailSyncResult } from "@/lib/email/types";

type WorkspaceView = "dashboard" | "map" | "campaigns";

interface FounderWorkspaceProps {
  appTimeZone?: string;
  founder: FounderProfile;
  people: PersonInsight[];
  pods: RelationshipPod[];
  campaigns: CampaignInsight[];
  recommendations: DailyRecommendation[];
  generatedAt: string;
}

const views: Array<{ id: WorkspaceView; label: string; icon: LucideIcon }> = [
  { id: "dashboard", label: "Dashboard", icon: Target },
  { id: "map", label: "Map", icon: Network },
  { id: "campaigns", label: "Campaigns", icon: Layers },
];

const savedDashboardsStorageKey = "real-deal:saved-dashboard-history";
const importedContactsStorageKey = "real-deal:imported-contacts-history";
const gmailSyncStorageKey = "real-deal:gmail-email-sync-history";
const manualCampaignsStorageKey = "real-deal:manual-campaigns";
const deletedCampaignsStorageKey = "real-deal:deleted-campaigns";

export function FounderWorkspace({
  appTimeZone = DEFAULT_APP_TIME_ZONE,
  founder,
  people,
  pods,
  campaigns,
  recommendations,
  generatedAt,
}: FounderWorkspaceProps) {
  const [activeView, setActiveView] = useState<WorkspaceView>("dashboard");
  const [selectedPersonId, setSelectedPersonId] = useState(recommendations[0]?.personId ?? people[0]?.id ?? "");
  const [selectedPodId, setSelectedPodId] = useState("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id ?? "");
  const [plannedPeople, setPlannedPeople] = useState<Record<string, boolean>>({});
  const [savedDashboards, setSavedDashboards] = useState<SavedDashboardSnapshot[]>([]);
  const [saveStatus, setSaveStatus] = useState("No dashboard saved in this browser yet.");
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showGmailPanel, setShowGmailPanel] = useState(false);
  const [showAllContactsWindow, setShowAllContactsWindow] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportResult[]>([]);
  const [emailSyncResult, setEmailSyncResult] = useState<EmailSyncResult | null>(null);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [isContactSearchFocused, setIsContactSearchFocused] = useState(false);
  const [manualCampaigns, setManualCampaigns] = useState<CampaignInsight[]>([]);
  const [deletedCampaignIds, setDeletedCampaignIds] = useState<string[]>([]);

  const deletedCampaignIdSet = useMemo(() => new Set(deletedCampaignIds), [deletedCampaignIds]);
  const manualCampaignsWithCurrentPeople = useMemo(
    () =>
      manualCampaigns.map((campaign) => ({
        ...campaign,
        targetPeople: campaign.targetPeopleIds
          .map((personId) => people.find((person) => person.id === personId))
          .filter(Boolean) as PersonInsight[],
      })),
    [manualCampaigns, people],
  );
  const baseCampaignCatalog = useMemo(
    () => [...campaigns, ...manualCampaignsWithCurrentPeople].filter((campaign) => !deletedCampaignIdSet.has(campaign.id)),
    [campaigns, deletedCampaignIdSet, manualCampaignsWithCurrentPeople],
  );
  const importedRelationshipState = useMemo(
    () =>
      buildImportedRelationshipState({
        baseCampaigns: baseCampaignCatalog,
        basePeople: people,
        baseRecommendations: recommendations,
        importHistory,
        referenceDate: generatedAt,
      }),
    [baseCampaignCatalog, generatedAt, importHistory, people, recommendations],
  );
  const importedRelationshipStateWithoutDeletedCampaigns = useMemo(
    () => ({
      ...importedRelationshipState,
      campaigns: importedRelationshipState.campaigns.filter((campaign) => !deletedCampaignIdSet.has(campaign.id)),
    }),
    [deletedCampaignIdSet, importedRelationshipState],
  );
  const campaignRelationshipState = useMemo(
    () =>
      buildCampaignRelationshipState({
        people: importedRelationshipStateWithoutDeletedCampaigns.people,
        campaigns: importedRelationshipStateWithoutDeletedCampaigns.campaigns,
        recommendations: importedRelationshipStateWithoutDeletedCampaigns.recommendations,
        referenceDate: generatedAt,
      }),
    [generatedAt, importedRelationshipStateWithoutDeletedCampaigns],
  );
  const relationshipState = useMemo(
    () =>
      buildEmailEnrichedRelationshipState({
        people: campaignRelationshipState.people,
        campaigns: campaignRelationshipState.campaigns,
        recommendations: campaignRelationshipState.recommendations,
        emailSyncResult,
        referenceDate: generatedAt,
      }),
    [campaignRelationshipState, emailSyncResult, generatedAt],
  );
  const workspacePeople = relationshipState.people;
  const workspaceCampaigns = relationshipState.campaigns;
  const workspaceRecommendations = relationshipState.recommendations;

  const selectedPerson = useMemo(
    () => workspacePeople.find((person) => person.id === selectedPersonId) ?? workspacePeople[0],
    [workspacePeople, selectedPersonId],
  );
  const deferredMapSelectedPersonId = useDeferredValue(selectedPerson?.id ?? "");
  const selectedCampaign = useMemo(
    () => workspaceCampaigns.find((campaign) => campaign.id === selectedCampaignId) ?? workspaceCampaigns[0],
    [workspaceCampaigns, selectedCampaignId],
  );
  const selectedPodName = useMemo(() => {
    if (selectedPodId === "all") {
      return "All";
    }

    return pods.find((pod) => pod.id === selectedPodId)?.name ?? "All";
  }, [pods, selectedPodId]);
  const averageScore = useMemo(
    () =>
      Math.round(
        workspacePeople.reduce((total, person) => total + person.socialEquityScore.total, 0) / Math.max(workspacePeople.length, 1),
      ),
    [workspacePeople],
  );
  const atRiskCount = useMemo(
    () => workspacePeople.filter((person) => person.socialEquityScore.decayRisk >= 55).length,
    [workspacePeople],
  );
  const podNameById = useMemo(() => new Map(pods.map((pod) => [pod.id, pod.name])), [pods]);
  const contactSearchResults = useMemo(() => {
    const normalizedQuery = contactSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);

    return workspacePeople
      .map((person) => {
        const podName = podNameById.get(person.podId) ?? "";
        const primaryMatchText = `${person.name} ${person.company}`.toLowerCase();
        const searchableText = [
          person.name,
          person.role,
          person.company,
          person.email ?? "",
          person.category,
          person.ring,
          podName,
          person.notes,
          person.recentOpportunity ?? "",
          person.nextActionCommitment ?? "",
          ...person.tags,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchTerms.every((term) => searchableText.includes(term))) {
          return null;
        }

        const nameStartsWithQuery = person.name.toLowerCase().startsWith(normalizedQuery);
        const rankBoost = nameStartsWithQuery ? 45 : primaryMatchText.includes(normalizedQuery) ? 25 : 0;

        return {
          person,
          rank: person.socialEquityScore.total + rankBoost,
        };
      })
      .filter((result): result is { person: PersonInsight; rank: number } => Boolean(result))
      .sort((firstResult, secondResult) => secondResult.rank - firstResult.rank)
      .slice(0, 8)
      .map((result) => result.person);
  }, [contactSearchQuery, podNameById, workspacePeople]);
  const shouldShowContactSearchResults = isContactSearchFocused && contactSearchQuery.trim().length > 0;

  useEffect(() => {
    const loadLocalStateTimer = window.setTimeout(() => {
      try {
        const storedHistory = window.localStorage.getItem(savedDashboardsStorageKey);
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory) as SavedDashboardSnapshot[];
          if (Array.isArray(parsedHistory)) {
            setSavedDashboards(parsedHistory);
            setSaveStatus(`${parsedHistory.length} saved dashboard${parsedHistory.length === 1 ? "" : "s"} in history.`);
          }
        }

        const storedImports = window.localStorage.getItem(importedContactsStorageKey);
        if (storedImports) {
          const parsedImports = JSON.parse(storedImports) as ImportResult[];
          if (Array.isArray(parsedImports)) {
            setImportHistory(parsedImports);
          }
        }

        const storedGmailSync = window.localStorage.getItem(gmailSyncStorageKey);
        if (storedGmailSync) {
          const parsedGmailSync = JSON.parse(storedGmailSync) as EmailSyncResult;
          if (parsedGmailSync?.sourceName === "Gmail" && Array.isArray(parsedGmailSync.events)) {
            setEmailSyncResult(parsedGmailSync);
          }
        }

        const storedManualCampaigns = window.localStorage.getItem(manualCampaignsStorageKey);
        if (storedManualCampaigns) {
          const parsedManualCampaigns = JSON.parse(storedManualCampaigns) as CampaignInsight[];
          if (Array.isArray(parsedManualCampaigns)) {
            setManualCampaigns(parsedManualCampaigns);
          }
        }

        const storedDeletedCampaigns = window.localStorage.getItem(deletedCampaignsStorageKey);
        if (storedDeletedCampaigns) {
          const parsedDeletedCampaigns = JSON.parse(storedDeletedCampaigns) as string[];
          if (Array.isArray(parsedDeletedCampaigns)) {
            setDeletedCampaignIds(parsedDeletedCampaigns.filter((campaignId) => typeof campaignId === "string"));
          }
        }
      } catch {
        setSaveStatus("Saved dashboard history could not be loaded.");
      }
    }, 0);

    return () => window.clearTimeout(loadLocalStateTimer);
  }, []);

  useEffect(() => {
    function refreshIfAppDateChanged() {
      if (hasAppDateChanged(generatedAt, new Date(), appTimeZone)) {
        window.location.reload();
      }
    }

    const dailyRefreshInterval = window.setInterval(refreshIfAppDateChanged, 60_000);

    window.addEventListener("focus", refreshIfAppDateChanged);
    document.addEventListener("visibilitychange", refreshIfAppDateChanged);

    return () => {
      window.clearInterval(dailyRefreshInterval);
      window.removeEventListener("focus", refreshIfAppDateChanged);
      document.removeEventListener("visibilitychange", refreshIfAppDateChanged);
    };
  }, [appTimeZone, generatedAt]);

  const handleSelectCampaign = useCallback((campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setActiveView("campaigns");
  }, []);

  const handleSelectPerson = useCallback((personId: string) => {
    setSelectedPersonId((currentPersonId) => (currentPersonId === personId ? currentPersonId : personId));
  }, []);

  const handleSelectSearchResult = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setSelectedPodId("all");
    setActiveView("dashboard");
    setContactSearchQuery("");
    setIsContactSearchFocused(false);
  }, []);

  const handleSelectAllContact = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setSelectedPodId("all");
    setActiveView("dashboard");
    setShowAllContactsWindow(false);
  }, []);

  const handleTogglePlanned = useCallback((personId: string) => {
    setPlannedPeople((current) => ({ ...current, [personId]: !current[personId] }));
  }, []);

  const handleSelectPod = useCallback((podId: string) => {
    setSelectedPodId((currentPodId) => (currentPodId === podId ? currentPodId : podId));
  }, []);

  const handleDashboardCampaignSelect = useCallback((campaignId: string) => {
    setSelectedCampaignId((currentCampaignId) => (currentCampaignId === campaignId ? currentCampaignId : campaignId));
  }, []);

  const handleOpenCampaigns = useCallback(() => {
    setActiveView("campaigns");
  }, []);

  const persistManualCampaigns = useCallback((nextCampaigns: CampaignInsight[]) => {
    setManualCampaigns(nextCampaigns);
    window.localStorage.setItem(manualCampaignsStorageKey, JSON.stringify(nextCampaigns));
  }, []);

  const persistDeletedCampaignIds = useCallback((nextDeletedCampaignIds: string[]) => {
    setDeletedCampaignIds(nextDeletedCampaignIds);
    window.localStorage.setItem(deletedCampaignsStorageKey, JSON.stringify(nextDeletedCampaignIds));
  }, []);

  const handleCreateCampaign = useCallback(
    (input: ManualCampaignInput) => {
      const nextCampaign = buildManualCampaign(input, workspacePeople);
      const nextManualCampaigns = [nextCampaign, ...manualCampaigns.filter((campaign) => campaign.id !== nextCampaign.id)];
      persistManualCampaigns(nextManualCampaigns);
      persistDeletedCampaignIds(deletedCampaignIds.filter((campaignId) => campaignId !== nextCampaign.id));
      setSelectedCampaignId(nextCampaign.id);
      setActiveView("campaigns");
      setSaveStatus(
        `Created campaign ${nextCampaign.title} with ${nextCampaign.targetPeopleIds.length} target contact${
          nextCampaign.targetPeopleIds.length === 1 ? "" : "s"
        }.`,
      );
    },
    [deletedCampaignIds, manualCampaigns, persistDeletedCampaignIds, persistManualCampaigns, workspacePeople],
  );

  const handleDeleteCampaign = useCallback(
    (campaignId: string) => {
      const campaignToDelete = workspaceCampaigns.find((campaign) => campaign.id === campaignId);

      if (!campaignToDelete) {
        return;
      }

      const nextManualCampaigns = manualCampaigns.filter((campaign) => campaign.id !== campaignId);
      const nextDeletedCampaignIds = Array.from(new Set([...deletedCampaignIds, campaignId]));
      const nextSelectedCampaignId = workspaceCampaigns.find((campaign) => campaign.id !== campaignId)?.id ?? "";

      persistManualCampaigns(nextManualCampaigns);
      persistDeletedCampaignIds(nextDeletedCampaignIds);
      setSelectedCampaignId(nextSelectedCampaignId);
      setSaveStatus(`Deleted campaign ${campaignToDelete.title}. It has been removed from active campaign lists.`);
    },
    [deletedCampaignIds, manualCampaigns, persistDeletedCampaignIds, persistManualCampaigns, workspaceCampaigns],
  );

  const persistDashboardHistory = useCallback((nextHistory: SavedDashboardSnapshot[]) => {
    setSavedDashboards(nextHistory);
    window.localStorage.setItem(savedDashboardsStorageKey, JSON.stringify(nextHistory));
  }, []);

  const handleSaveDashboard = useCallback(() => {
    if (!selectedPerson || !selectedCampaign) {
      setSaveStatus("Select a relationship before saving the dashboard.");
      return;
    }

    const snapshot: SavedDashboardSnapshot = {
      id: `dashboard-${Date.now()}`,
      savedAt: new Date().toISOString(),
      generatedAt,
      selectedPersonName: selectedPerson.name,
      selectedPersonCompany: selectedPerson.company,
      selectedCampaignTitle: selectedCampaign.title,
      selectedPodName,
      plannedTouchCount: Object.values(plannedPeople).filter(Boolean).length,
      recommendationCount: workspaceRecommendations.length,
      averageScore,
      atRiskCount,
      people: workspacePeople.map((person) => ({
        id: person.id,
        name: person.name,
        company: person.company,
        score: person.socialEquityScore.total,
        decayRisk: person.socialEquityScore.decayRisk,
      })),
    };
    const nextHistory = [snapshot, ...savedDashboards].slice(0, 12);
    persistDashboardHistory(nextHistory);
    setSaveStatus(`Saved dashboard with ${snapshot.people.length} people in history.`);
  }, [
    atRiskCount,
    averageScore,
    generatedAt,
    persistDashboardHistory,
    plannedPeople,
    savedDashboards,
    selectedCampaign,
    selectedPerson,
    selectedPodName,
    workspacePeople,
    workspaceRecommendations.length,
  ]);

  const handleClearDashboardHistory = useCallback(() => {
    persistDashboardHistory([]);
    setSaveStatus("Saved dashboard history cleared.");
  }, [persistDashboardHistory]);

  const handleImportedContacts = useCallback((result: ImportResult) => {
    setImportHistory((currentHistory) => {
      const nextHistory = [result, ...currentHistory].slice(0, 10);
      window.localStorage.setItem(importedContactsStorageKey, JSON.stringify(nextHistory));
      return nextHistory;
    });
    const firstImportedContact = result.contacts[0];
    if (firstImportedContact) {
      setSelectedPersonId(`imported-${firstImportedContact.id}`);
      setSelectedCampaignId(firstImportedContact.campaignIds[0] ?? selectedCampaignId);
      setSelectedPodId("all");
      setActiveView("dashboard");
    }
    setSaveStatus(
      `Imported ${result.summary.contactsImported} contact${result.summary.contactsImported === 1 ? "" : "s"} into the active relationship system.`,
    );
  }, [selectedCampaignId]);

  const handleClearImportHistory = useCallback(() => {
    setImportHistory([]);
    window.localStorage.removeItem(importedContactsStorageKey);
  }, []);

  const handleGmailSynced = useCallback((result: EmailSyncResult) => {
    setEmailSyncResult(result);
    window.localStorage.setItem(gmailSyncStorageKey, JSON.stringify(result));
    setSaveStatus(
      `Synced ${result.summary.messagesImported} Gmail email${result.summary.messagesImported === 1 ? "" : "s"} into relationship history.`,
    );
  }, []);

  return (
    <main className="app-shell min-h-screen px-3 py-4 text-[#ffffff] sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-4">
        <header className="glass-surface rounded-lg p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#2fb65d] text-[#001426]">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-normal text-[#ffffff] sm:text-2xl">Real Deal</h1>
                  <p className="mt-1 text-sm text-[#a8bdd0]">{founder.operatingFocus}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#edf7ff]">
                <UserRound className="h-4 w-4 text-[#2fb65d]" aria-hidden="true" />
                <span className="truncate">
                  {founder.name}, {founder.company}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#edf7ff]">
                <CalendarDays className="h-4 w-4 text-[#79c7ff]" aria-hidden="true" />
                <time dateTime={generatedAt}>{formatLongDate(generatedAt)}</time>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/report"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#2fb65d]/35 bg-[#2fb65d]/10 px-3 py-2 text-sm font-semibold text-[#dfffe8] transition hover:bg-[#2fb65d]/20"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Report
                </a>
                <button
                  type="button"
                  onClick={handleSaveDashboard}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ffffff] px-3 py-2 text-sm font-semibold text-[#001426] transition hover:bg-white"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setShowGmailPanel((current) => !current)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                    showGmailPanel
                      ? "bg-[#79c7ff] text-[#001426]"
                      : "border border-white/10 bg-white/[0.04] text-[#edf7ff] hover:bg-white/10",
                  )}
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Sync Gmail
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllContactsWindow(true)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                    showAllContactsWindow
                      ? "bg-[#00477f] text-white"
                      : "border border-white/10 bg-white/[0.04] text-[#edf7ff] hover:bg-white/10",
                  )}
                >
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                  All contacts
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportPanel((current) => !current)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                    showImportPanel
                      ? "bg-[#2fb65d] text-[#001426]"
                      : "border border-white/10 bg-white/[0.04] text-[#edf7ff] hover:bg-white/10",
                  )}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Upload contacts
                </button>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-[#a8bdd0]" role="status">
            {saveStatus}
          </p>

          <div className="mt-4 max-w-3xl" role="search">
            <label htmlFor="contact-search" className="sr-only">
              Search contacts
            </label>
            <div
              className="relative"
              onBlur={(event) => {
                const nextTarget = event.relatedTarget;

                if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                  setIsContactSearchFocused(false);
                }
              }}
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#79c7ff]"
                aria-hidden="true"
              />
              <input
                id="contact-search"
                type="search"
                value={contactSearchQuery}
                onChange={(event) => {
                  setContactSearchQuery(event.target.value);
                  setIsContactSearchFocused(true);
                }}
                onFocus={() => setIsContactSearchFocused(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setContactSearchQuery("");
                    setIsContactSearchFocused(false);
                  }

                  if (event.key === "Enter" && contactSearchResults[0]) {
                    event.preventDefault();
                    handleSelectSearchResult(contactSearchResults[0].id);
                  }
                }}
                aria-controls="contact-search-results"
                autoComplete="off"
                placeholder="Search contacts by name, company, role, tag, or email"
                className="h-11 w-full rounded-md border border-white/10 bg-white/[0.05] px-10 pr-11 text-sm text-[#ffffff] outline-none transition placeholder:text-[#7fa0b8] focus:border-[#2fb65d]/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#2fb65d]/20"
              />
              {contactSearchQuery && (
                <button
                  type="button"
                  aria-label="Clear contact search"
                  title="Clear search"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setContactSearchQuery("");
                    setIsContactSearchFocused(false);
                  }}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#a8bdd0] transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              {shouldShowContactSearchResults && (
                <div
                  id="contact-search-results"
                  className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-md border border-white/10 bg-[#031d35] p-2 shadow-2xl"
                >
                  {contactSearchResults.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {contactSearchResults.map((person) => {
                        const podName = podNameById.get(person.podId) ?? "Network";

                        return (
                          <button
                            key={person.id}
                            type="button"
                            aria-label={`Select ${person.name} from search`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleSelectSearchResult(person.id)}
                            className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[#ffffff]">{person.name}</span>
                              <span className="mt-0.5 block truncate text-xs text-[#a8bdd0]">
                                {person.role}, {person.company}
                              </span>
                              <span className="mt-1 block truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[#79c7ff]">
                                {podName} - {person.ring} ring
                              </span>
                            </span>
                            <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-[#dfffe8]">
                              {person.socialEquityScore.total}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-[#a8bdd0]">
                      No contacts found. Try a name, company, role, tag, or email.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-2" aria-label="Workspace views">
            {views.map((view) => {
              const Icon = view.icon;
              const isSelected = activeView === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setActiveView(view.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition",
                    isSelected
                      ? "border-[#2fb65d]/50 bg-[#2fb65d]/15 text-[#dfffe8]"
                      : "border-white/10 text-[#a8bdd0] hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {view.label}
                </button>
              );
            })}
          </nav>
        </header>

        {showImportPanel && (
          <DataImportPanel
            campaigns={workspaceCampaigns}
            importHistory={importHistory}
            onClearHistory={handleClearImportHistory}
            onClose={() => setShowImportPanel(false)}
            onImported={handleImportedContacts}
          />
        )}

        {showGmailPanel && (
          <GmailSyncPanel
            latestSync={emailSyncResult}
            onClose={() => setShowGmailPanel(false)}
            onSynced={handleGmailSynced}
            people={workspacePeople}
          />
        )}

        {showAllContactsWindow && (
          <AllContactsWindow
            campaigns={workspaceCampaigns}
            onClose={() => setShowAllContactsWindow(false)}
            onSelectPerson={handleSelectAllContact}
            people={workspacePeople}
            pods={pods}
            selectedPersonId={selectedPerson?.id ?? ""}
          />
        )}

        {activeView === "dashboard" && (
          <>
            <section className="grid gap-4 xl:grid-cols-[360px_minmax(480px,1fr)_390px]">
              <DailyFocusQueue
                campaigns={workspaceCampaigns}
                onSelectPerson={handleSelectPerson}
                onTogglePlanned={handleTogglePlanned}
                people={workspacePeople}
                plannedPeople={plannedPeople}
                recommendations={workspaceRecommendations}
                selectedPersonId={selectedPerson?.id ?? ""}
              />
              <RelationshipMap
                campaigns={workspaceCampaigns}
                compact
                onSelectPerson={handleSelectPerson}
                onSelectPod={handleSelectPod}
                people={workspacePeople}
                pods={pods}
                referenceDate={generatedAt}
                selectedPersonId={deferredMapSelectedPersonId}
                selectedPodId={selectedPodId}
              />
              <PersonDetailPanel
                campaigns={workspaceCampaigns}
                onSelectCampaign={handleSelectCampaign}
                person={selectedPerson}
              />
            </section>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
              <RelationshipHealthOverview campaigns={workspaceCampaigns} people={workspacePeople} />
              <ActiveCampaignSummary
                campaigns={workspaceCampaigns}
                onOpenCampaigns={handleOpenCampaigns}
                onSelectCampaign={handleDashboardCampaignSelect}
                selectedCampaignId={selectedCampaignId}
              />
            </section>
            <DashboardHistory snapshots={savedDashboards} onClearHistory={handleClearDashboardHistory} />
          </>
        )}

        {activeView === "map" && (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <RelationshipMap
              campaigns={workspaceCampaigns}
              onSelectPerson={handleSelectPerson}
              onSelectPod={handleSelectPod}
              people={workspacePeople}
              pods={pods}
              referenceDate={generatedAt}
              selectedPersonId={selectedPerson?.id ?? ""}
              selectedPodId={selectedPodId}
            />
            <PersonDetailPanel campaigns={workspaceCampaigns} onSelectCampaign={handleSelectCampaign} person={selectedPerson} />
          </section>
        )}

        {activeView === "campaigns" && (
          <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
            <CampaignWorkspace
              campaigns={workspaceCampaigns}
              people={workspacePeople}
              onCreateCampaign={handleCreateCampaign}
              onDeleteCampaign={handleDeleteCampaign}
              onSelectCampaign={setSelectedCampaignId}
              onSelectPerson={handleSelectPerson}
              selectedCampaignId={selectedCampaignId}
            />
            <PersonDetailPanel campaigns={workspaceCampaigns} onSelectCampaign={handleSelectCampaign} person={selectedPerson} />
          </section>
        )}
      </div>
    </main>
  );
}
