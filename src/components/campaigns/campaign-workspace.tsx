import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Briefcase,
  CalendarDays,
  DollarSign,
  Handshake,
  ListChecks,
  PartyPopper,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Panel } from "@/components/shared/panel";
import { ScoreMeter } from "@/components/shared/score-meter";
import { formatCampaignType, StatusBadge } from "@/components/shared/status-badge";
import type { CampaignInsight, CampaignStatus, CampaignType, PersonInsight } from "@/lib/data/types";
import type { ManualCampaignInput } from "@/lib/campaigns/manual-campaigns";
import { cn } from "@/lib/utils/classnames";
import { formatShortDate } from "@/lib/utils/dates";

interface CampaignWorkspaceProps {
  campaigns: CampaignInsight[];
  people: PersonInsight[];
  selectedCampaignId: string;
  onCreateCampaign: (campaign: ManualCampaignInput) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onSelectCampaign: (campaignId: string) => void;
  onSelectPerson: (personId: string) => void;
}

const campaignIcons: Record<CampaignType, typeof DollarSign> = {
  fundraising: DollarSign,
  hiring: Briefcase,
  event: PartyPopper,
  partnership: Handshake,
  "customer-intros": UserPlus,
};

const campaignTypeOptions: Array<{ value: CampaignType; label: string }> = [
  { value: "fundraising", label: "Fundraising" },
  { value: "hiring", label: "Hiring" },
  { value: "event", label: "Event" },
  { value: "partnership", label: "Partnership" },
  { value: "customer-intros", label: "Customer intros" },
];

const campaignStatusOptions: Array<{ value: CampaignStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "planning", label: "Planning" },
  { value: "paused", label: "Paused" },
  { value: "complete", label: "Complete" },
];

function getSearchablePersonText(person: PersonInsight): string {
  return [
    person.name,
    person.role,
    person.company,
    person.email ?? "",
    person.category,
    person.notes,
    ...person.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function getInitialDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

export function CampaignWorkspace({
  campaigns,
  people,
  selectedCampaignId,
  onCreateCampaign,
  onDeleteCampaign,
  onSelectCampaign,
  onSelectPerson,
}: CampaignWorkspaceProps) {
  const [targetSearchQuery, setTargetSearchQuery] = useState("");
  const [selectedTargetPersonIds, setSelectedTargetPersonIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState("");
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0];
  const selectedTargetPeople = useMemo(
    () =>
      selectedTargetPersonIds
        .map((personId) => people.find((person) => person.id === personId))
        .filter(Boolean) as PersonInsight[],
    [people, selectedTargetPersonIds],
  );
  const targetSearchResults = useMemo(() => {
    const normalizedQuery = targetSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);

    return people
      .filter((person) => !selectedTargetPersonIds.includes(person.id))
      .filter((person) => searchTerms.every((term) => getSearchablePersonText(person).includes(term)))
      .sort((left, right) => right.socialEquityScore.total - left.socialEquityScore.total)
      .slice(0, 6);
  }, [people, selectedTargetPersonIds, targetSearchQuery]);

  function handleAddTargetPerson(personId: string) {
    setSelectedTargetPersonIds((current) => Array.from(new Set([...current, personId])));
    setTargetSearchQuery("");
    setFormStatus("");
  }

  function handleRemoveTargetPerson(personId: string) {
    setSelectedTargetPersonIds((current) => current.filter((targetPersonId) => targetPersonId !== personId));
  }

  function handleSubmitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();

    if (!title) {
      setFormStatus("Campaign title is required.");
      return;
    }

    if (selectedTargetPersonIds.length === 0) {
      setFormStatus("Add at least one contact to the campaign.");
      return;
    }

    onCreateCampaign({
      title,
      type: String(formData.get("type") ?? "partnership") as CampaignType,
      status: String(formData.get("status") ?? "active") as CampaignStatus,
      stage: String(formData.get("stage") ?? ""),
      objective: String(formData.get("objective") ?? ""),
      dueDate: String(formData.get("dueDate") ?? "").trim() || getInitialDueDate(),
      targetPersonIds: selectedTargetPersonIds,
      nextActionLabel: String(formData.get("nextAction") ?? ""),
      owner: String(formData.get("owner") ?? "").trim() || "Avery Hart",
    });
    form.reset();
    setSelectedTargetPersonIds([]);
    setTargetSearchQuery("");
    setFormStatus("Campaign created and added to active campaigns.");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Panel eyebrow="Campaigns" icon={ListChecks} title="Campaign list">
          {campaigns.length === 0 ? (
            <EmptyState icon={ListChecks} title="No campaigns" message="Create a campaign to coordinate relationship motion." />
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const Icon = campaignIcons[campaign.type];
                const isSelected = campaign.id === selectedCampaign?.id;

                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => onSelectCampaign(campaign.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition",
                      isSelected ? "border-[#f4bd45]/50 bg-[#f4bd45]/10" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10 text-[#f4bd45]">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#ffffff]">{campaign.title}</span>
                        <span className="mt-1 block text-xs text-[#a8bdd0]">{formatCampaignType(campaign.type)}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel eyebrow="Create" icon={Plus} title="Create campaign">
          <form onSubmit={handleSubmitCampaign} className="space-y-3">
            <label className="block text-sm text-[#edf7ff]">
              Campaign title
              <input
                id="manual-campaign-title"
                name="title"
                required
                className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                placeholder="Advisor Network Sprint"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block text-sm text-[#edf7ff]">
                Campaign type
                <select
                  id="manual-campaign-type"
                  name="type"
                  defaultValue="partnership"
                  className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                >
                  {campaignTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-[#edf7ff]">
                Status
                <select
                  id="manual-campaign-status"
                  name="status"
                  defaultValue="active"
                  className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                >
                  {campaignStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm text-[#edf7ff]">
              Due date
              <input
                id="manual-campaign-due-date"
                name="dueDate"
                type="date"
                defaultValue={getInitialDueDate()}
                className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
              />
            </label>
            <label className="block text-sm text-[#edf7ff]">
              Stage
              <input
                id="manual-campaign-stage"
                name="stage"
                className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                placeholder="Relationship activation"
              />
            </label>
            <label className="block text-sm text-[#edf7ff]">
              Objective
              <textarea
                id="manual-campaign-objective"
                name="objective"
                rows={3}
                className="mt-1 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                placeholder="Coordinate the relationships needed for this company priority."
              />
            </label>
            <label className="block text-sm text-[#edf7ff]">
              Next action
              <input
                id="manual-campaign-next-action"
                name="nextAction"
                className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                placeholder="Send tailored asks to selected contacts"
              />
            </label>
            <label className="block text-sm text-[#edf7ff]">
              Owner
              <input
                id="manual-campaign-owner"
                name="owner"
                className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                placeholder="Avery Hart"
              />
            </label>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <label htmlFor="campaign-contact-search" className="block text-sm font-semibold text-[#ffffff]">
                Search contacts to add
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#79c7ff]"
                  aria-hidden="true"
                />
                <input
                  id="campaign-contact-search"
                  type="search"
                  value={targetSearchQuery}
                  onChange={(event) => setTargetSearchQuery(event.target.value)}
                  placeholder="Find contacts to add"
                  className="min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-10 py-2 text-sm text-[#ffffff] placeholder:text-[#7fa0b8]"
                />
              </div>
              {targetSearchQuery.trim() && (
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
                  {targetSearchResults.length === 0 ? (
                    <p className="rounded-md border border-dashed border-white/10 p-3 text-sm text-[#a8bdd0]">No contacts found.</p>
                  ) : (
                    targetSearchResults.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        aria-label={`Add ${person.name} to campaign`}
                        onClick={() => handleAddTargetPerson(person.id)}
                        className="flex w-full items-start justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/10"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#ffffff]">{person.name}</span>
                          <span className="mt-1 block truncate text-xs text-[#a8bdd0]">
                            {person.role}, {person.company}
                          </span>
                        </span>
                        <span className="rounded-md bg-[#2fb65d]/15 px-2 py-1 font-mono text-xs text-[#7fe6a0]">
                          {person.socialEquityScore.total}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTargetPeople.length === 0 ? (
                  <span className="text-sm text-[#a8bdd0]">No contacts added yet.</span>
                ) : (
                  selectedTargetPeople.map((person) => (
                    <span
                      key={person.id}
                      className="inline-flex max-w-full items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-xs text-[#edf7ff]"
                    >
                      <span className="truncate">{person.name}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${person.name} from campaign`}
                        onClick={() => handleRemoveTargetPerson(person.id)}
                        className="text-[#a8bdd0] hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {formStatus && (
              <p
                className={cn(
                  "rounded-md border p-3 text-sm",
                  formStatus.includes("created")
                    ? "border-[#2fb65d]/30 bg-[#2fb65d]/10 text-[#bcf5ca]"
                    : "border-[#e96f80]/35 bg-[#e96f80]/10 text-[#ffd9df]",
                )}
                role={formStatus.includes("created") ? "status" : "alert"}
              >
                {formStatus}
              </p>
            )}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2fb65d] px-4 py-3 text-sm font-semibold text-[#001426] transition hover:bg-[#7fe6a0]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create campaign
            </button>
          </form>
        </Panel>
      </div>

      {selectedCampaign ? (
        <CampaignDetailPanel
          campaign={selectedCampaign}
          onDeleteCampaign={onDeleteCampaign}
          onSelectPerson={onSelectPerson}
        />
      ) : (
        <Panel icon={ListChecks} title="Campaign detail">
          <EmptyState icon={ListChecks} title="No campaign selected" message="Create a campaign or select one from the list." />
        </Panel>
      )}
    </div>
  );
}

function CampaignDetailPanel({
  campaign,
  onDeleteCampaign,
  onSelectPerson,
}: {
  campaign: CampaignInsight;
  onDeleteCampaign: (campaignId: string) => void;
  onSelectPerson: (personId: string) => void;
}) {
  const SelectedIcon = campaignIcons[campaign.type];

  return (
    <Panel
      eyebrow={formatCampaignType(campaign.type)}
      icon={SelectedIcon}
      title={campaign.title}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={campaign.status} tone={campaign.status} />
          <button
            type="button"
            onClick={() => onDeleteCampaign(campaign.id)}
            className="inline-flex items-center gap-2 rounded-md border border-[#e96f80]/35 bg-[#e96f80]/10 px-3 py-2 text-xs font-semibold text-[#ffd9df] transition hover:bg-[#e96f80]/20"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete campaign
          </button>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm leading-6 text-[#edf7ff]">{campaign.objective}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-white/[0.05] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#a8bdd0]">Stage</p>
                <p className="mt-2 text-sm font-semibold text-[#ffffff]">{campaign.stage}</p>
              </div>
              <div className="rounded-md bg-white/[0.05] p-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#a8bdd0]">Due</p>
                <p className="mt-2 text-sm font-semibold text-[#ffffff]">{formatShortDate(campaign.dueDate)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <ScoreMeter score={campaign.health} label="Campaign health" />
            <p className="mt-4 text-sm leading-6 text-[#c8d8e6]">{campaign.relevance}</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#ffffff]">
              <ListChecks className="h-4 w-4 text-[#2fb65d]" aria-hidden="true" />
              Next actions
            </div>
            <div className="space-y-2">
              {campaign.nextActions.map((action) => (
                <div key={action.id} className="rounded-md bg-white/[0.04] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-[#ffffff]">{action.label}</p>
                    <StatusBadge label={action.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#a8bdd0]">
                    <CalendarDays className="h-3.5 w-3.5 text-[#79c7ff]" aria-hidden="true" />
                    <span>
                      {action.owner} by {formatShortDate(action.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <p className="text-sm font-semibold text-[#ffffff]">Target people</p>
          <div className="mt-3 space-y-2">
            {campaign.targetPeople.length === 0 ? (
              <p className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-3 text-sm text-[#a8bdd0]">
                No target people are attached yet.
              </p>
            ) : (
              campaign.targetPeople.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onSelectPerson(person.id)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/10"
                >
                  <span className="block truncate text-sm font-semibold text-[#ffffff]">{person.name}</span>
                  <span className="mt-1 block truncate text-xs text-[#a8bdd0]">
                    {person.role}, {person.company}
                  </span>
                  <span className="mt-2 block font-mono text-xs text-[#2fb65d]">Score {person.socialEquityScore.total}</span>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>
    </Panel>
  );
}
