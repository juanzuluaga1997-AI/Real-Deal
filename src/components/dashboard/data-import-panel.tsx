"use client";

import { useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, GitMerge, Link2, Network, Sparkles, Upload, UserPlus, UsersRound, X } from "lucide-react";

import { Panel } from "@/components/shared/panel";
import { cn } from "@/lib/utils/classnames";
import type { CampaignInsight } from "@/lib/data/types";
import type { ImportedContactRecord, ImportResult, ImportSummary } from "@/lib/import/types";

interface DataImportPanelProps {
  campaigns: CampaignInsight[];
  importHistory: ImportResult[];
  onImported: (result: ImportResult) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

type ImportStatus =
  | { state: "idle"; message: string }
  | { state: "reading"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

type ImportMode = "file" | "google" | "manual";

const importModeOptions: Array<{ value: ImportMode; label: string; description: string }> = [
  {
    value: "file",
    label: "Upload CSV, Excel, or document",
    description: "Best for large contact lists and exported relationship data.",
  },
  {
    value: "google",
    label: "Import public Google document",
    description: "Use a shared Google Sheets, Docs, Slides, or Drive link.",
  },
  {
    value: "manual",
    label: "Add contact manually",
    description: "Create one strategic relationship with the same scoring and classification logic.",
  },
];

function getSummary(result: ImportResult | null): ImportSummary {
  return (
    result?.summary ?? {
      totalRowsProcessed: result?.recordCount ?? 0,
      contactsImported: result?.recordCount ?? 0,
      duplicatesMerged: 0,
      rowsNeedingReview: 0,
      campaignsDetected: [],
      podsAssigned: [],
      reviewIssues: [],
    }
  );
}

function getPreviewContacts(result: ImportResult | null): ImportedContactRecord[] {
  return result?.contacts.slice(0, 12) ?? [];
}

export function DataImportPanel({ campaigns, importHistory, onImported, onClearHistory, onClose }: DataImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("file");
  const [googleUrl, setGoogleUrl] = useState("");
  const [status, setStatus] = useState<ImportStatus>({
    state: "idle",
    message: "Choose an import method to add founder relationship data.",
  });
  const [latestSubmittedImport, setLatestSubmittedImport] = useState<ImportResult | null>(null);
  const latestImport = latestSubmittedImport ?? importHistory[0] ?? null;
  const activeCampaignOptions = campaigns.filter((campaign) => campaign.status !== "complete");

  async function submitImport(formData: FormData) {
    setStatus({ state: "reading", message: "Reading document and extracting contact information." });

    try {
      const response = await fetch("/api/imports/contacts", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { result?: ImportResult; error?: string };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Unable to import contacts.");
      }

      setLatestSubmittedImport(payload.result);
      onImported(payload.result);
      const summary = getSummary(payload.result);
      setStatus({
        state: "success",
        message: `Processed ${summary.totalRowsProcessed} rows from ${payload.result.sourceName}. Imported ${summary.contactsImported} contacts and merged ${summary.duplicatesMerged} duplicate${summary.duplicatesMerged === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Unable to import contacts.",
      });
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    await submitImport(formData);
    event.target.value = "";
  }

  async function handleGoogleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.append("googleUrl", googleUrl);
    await submitImport(formData);
  }

  async function handleManualImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const manualContact = {
      Name: formData.get("name"),
      Email: formData.get("email"),
      Phone: formData.get("phone"),
      Company: formData.get("company"),
      Role: formData.get("role"),
      "Relationship type": formData.get("relationshipType"),
      "Last interaction date": formData.get("lastInteractionDate"),
      Notes: formData.get("notes"),
      Tags: formData.get("tags"),
      Campaign: formData.get("campaign"),
      "Importance level": formData.get("importanceLevel"),
      Source: formData.get("source"),
      "Intro history": formData.get("introHistory"),
      Responsiveness: formData.get("responsiveness"),
      "Follow-up commitment": formData.get("followUpCommitment"),
    };
    const requestData = new FormData();
    requestData.append("manualContact", JSON.stringify(manualContact));
    await submitImport(requestData);
    form.reset();
  }

  return (
    <Panel
      eyebrow="Import"
      icon={Upload}
      title="Upload contacts"
      action={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-[#a8bdd0] transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Close
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <label htmlFor="import-method" className="block text-xs font-medium uppercase tracking-[0.16em] text-[#a8bdd0]">
              Import method
            </label>
            <select
              id="import-method"
              value={importMode}
              onChange={(event) => {
                setImportMode(event.target.value as ImportMode);
                setStatus({ state: "idle", message: "Choose an import method to add founder relationship data." });
              }}
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm font-semibold text-[#ffffff]"
            >
              {importModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm leading-6 text-[#a8bdd0]">
              {importModeOptions.find((option) => option.value === importMode)?.description}
            </p>
          </div>

          {importMode === "file" && (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ffffff]">
              <FileSpreadsheet className="h-4 w-4 text-[#2fb65d]" aria-hidden="true" />
              Upload a document
            </div>
            <p className="mt-2 text-sm leading-6 text-[#a8bdd0]">
              Built for 1,000+ row CSV and Excel uploads. The importer normalizes fields, merges duplicates, assigns pods,
              detects campaigns, creates initial relationship scores, and adds imported contacts to the active relationship system.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".xlsx,.xls,.csv,.docx,.pptx,.pdf,.json,.txt,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={status.state === "reading"}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#ffffff] px-4 py-3 text-sm font-semibold text-[#001426] transition hover:bg-white disabled:bg-white/20 disabled:text-[#a8bdd0]"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Choose file
            </button>
            </div>
          )}

          {importMode === "google" && (
            <form onSubmit={handleGoogleImport} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ffffff]">
              <Link2 className="h-4 w-4 text-[#79c7ff]" aria-hidden="true" />
              Import from Google
            </div>
            <label htmlFor="google-document-url" className="mt-3 block text-xs font-medium uppercase tracking-[0.16em] text-[#a8bdd0]">
              Public Google link
            </label>
            <input
              id="google-document-url"
              type="url"
              value={googleUrl}
              onChange={(event) => setGoogleUrl(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff] placeholder:text-[#7fa0b8]"
            />
            <button
              type="submit"
              disabled={status.state === "reading" || !googleUrl.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2fb65d] px-4 py-3 text-sm font-semibold text-[#001426] transition hover:bg-[#7fe6a0] disabled:bg-white/20 disabled:text-[#a8bdd0]"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Import Google document
            </button>
            <p className="mt-3 text-xs leading-5 text-[#a8bdd0]">
              Public Google Sheets, Docs, Slides, and Drive file links are supported. Private Google files require a
              future OAuth connection.
            </p>
            </form>
          )}

          {importMode === "manual" && (
            <form onSubmit={handleManualImport} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#ffffff]">
                <UserPlus className="h-4 w-4 text-[#2fb65d]" aria-hidden="true" />
                Add contact manually
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-[#edf7ff]">
                  Name
                  <input
                    name="name"
                    required
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="Morgan Lee"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Email
                  <input
                    name="email"
                    type="email"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="morgan@example.com"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Company
                  <input
                    name="company"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="Harbor Fund"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Role
                  <input
                    name="role"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="Partner"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Relationship type
                  <select
                    name="relationshipType"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                  >
                    <option value="">Select relationship type</option>
                    <option value="Investor">Investor</option>
                    <option value="Advisor">Advisor</option>
                    <option value="Customer">Customer</option>
                    <option value="Partner">Partner</option>
                    <option value="Operator">Operator</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="Candidate">Candidate</option>
                    <option value="Founder">Founder</option>
                    <option value="CEO">CEO</option>
                  </select>
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Last interaction date
                  <input
                    name="lastInteractionDate"
                    type="date"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Campaign
                  <select
                    name="campaign"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                  >
                    <option value="">Select active campaign</option>
                    {activeCampaignOptions.map((campaign) => (
                      <option key={campaign.id} value={campaign.title}>
                        {campaign.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Importance level
                  <select
                    name="importanceLevel"
                    defaultValue="8"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                  >
                    <option value="10">10 - Critical</option>
                    <option value="9">9 - Very high</option>
                    <option value="8">8 - High</option>
                    <option value="7">7 - Strong</option>
                    <option value="6">6 - Medium</option>
                    <option value="5">5 - Normal</option>
                    <option value="4">4 - Light</option>
                    <option value="3">3 - Low</option>
                  </select>
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Responsiveness
                  <input
                    name="responsiveness"
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="85"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff]">
                  Source
                  <input
                    name="source"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="Warm intro"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff] sm:col-span-2">
                  Phone
                  <input
                    name="phone"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="555-010-0199"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff] sm:col-span-2">
                  Tags
                  <input
                    name="tags"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="Series A, lead investor path"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff] sm:col-span-2">
                  Intro history
                  <input
                    name="introHistory"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="Introduced by Maya Chen"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff] sm:col-span-2">
                  Follow-up commitment
                  <input
                    name="followUpCommitment"
                    className="mt-1 min-h-11 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="Send the revised metrics memo"
                  />
                </label>
                <label className="block text-sm text-[#edf7ff] sm:col-span-2">
                  Notes
                  <textarea
                    name="notes"
                    rows={4}
                    className="mt-1 w-full rounded-md border border-white/10 bg-[#001426] px-3 py-2 text-sm text-[#ffffff]"
                    placeholder="Context, history, and what makes this relationship important"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={status.state === "reading"}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#2fb65d] px-4 py-3 text-sm font-semibold text-[#001426] transition hover:bg-[#7fe6a0] disabled:bg-white/20 disabled:text-[#a8bdd0]"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Add contact
              </button>
            </form>
          )}

          <p
            className={cn(
              "rounded-lg border p-3 text-sm leading-6",
              status.state === "success"
                ? "border-[#2fb65d]/30 bg-[#2fb65d]/10 text-[#bcf5ca]"
                : status.state === "error"
                  ? "border-[#e96f80]/35 bg-[#e96f80]/10 text-[#ffd9df]"
                  : "border-white/10 bg-white/[0.035] text-[#a8bdd0]",
            )}
            role={status.state === "error" ? "alert" : "status"}
          >
            {status.message}
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#ffffff]">Import summary</p>
                <p className="mt-1 text-xs text-[#a8bdd0]">
                  {latestImport ? `${getSummary(latestImport).totalRowsProcessed} rows from ${latestImport.sourceName}` : "No import parsed yet"}
                </p>
              </div>
              <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#edf7ff]">
                {latestImport?.sourceType ?? "idle"}
              </span>
            </div>
            {latestImport ? (
              <>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      label: "Rows processed",
                      value: getSummary(latestImport).totalRowsProcessed,
                      icon: FileSpreadsheet,
                    },
                    {
                      label: "Contacts imported",
                      value: getSummary(latestImport).contactsImported,
                      icon: UsersRound,
                    },
                    {
                      label: "Duplicates merged",
                      value: getSummary(latestImport).duplicatesMerged,
                      icon: GitMerge,
                    },
                    {
                      label: "Rows needing review",
                      value: getSummary(latestImport).rowsNeedingReview,
                      icon: AlertTriangle,
                    },
                  ].map((metric) => {
                    const Icon = metric.icon;

                    return (
                      <div key={metric.label} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-center gap-2 text-xs text-[#a8bdd0]">
                          <Icon className="h-3.5 w-3.5 text-[#7fe6a0]" aria-hidden="true" />
                          {metric.label}
                        </div>
                        <p className="mt-2 font-mono text-xl font-semibold text-[#ffffff]">{metric.value}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#a8bdd0]">
                      <Sparkles className="h-3.5 w-3.5 text-[#f4bd45]" aria-hidden="true" />
                      Campaigns detected
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getSummary(latestImport).campaignsDetected.length === 0 ? (
                        <span className="text-sm text-[#a8bdd0]">No campaigns detected</span>
                      ) : (
                        getSummary(latestImport).campaignsDetected.map((campaign) => (
                          <span key={campaign} className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#edf7ff]">
                            {campaign}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#a8bdd0]">
                      <Network className="h-3.5 w-3.5 text-[#79c7ff]" aria-hidden="true" />
                      Pods assigned
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getSummary(latestImport).podsAssigned.map((pod) => (
                        <span key={pod.podId} className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#edf7ff]">
                          {pod.podName}: {pod.count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm leading-6 text-[#a8bdd0]">
                Imported contacts will be normalized, deduplicated, scored, and added to the active relationship system.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-[#ffffff]">Prioritized contact preview</p>
            <p className="mt-1 text-xs text-[#a8bdd0]">
              {latestImport ? "Sorted by initial relationship score" : "No scored contacts yet"}
            </p>
            {latestImport ? (
              <div className="contained-scroll mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-2">
                {getPreviewContacts(latestImport).map((contact) => (
                  <article key={contact.id} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#ffffff]">{contact.name}</p>
                        <p className="mt-1 text-xs text-[#a8bdd0]">
                          {[contact.role, contact.company].filter(Boolean).join(", ") || "No role or company detected"}
                        </p>
                      </div>
                      <span className="rounded-md bg-[#2fb65d]/15 px-2 py-1 font-mono text-xs font-semibold text-[#7fe6a0]">
                        {contact.initialSocialEquityScore}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#edf7ff]">{contact.podName}</span>
                      <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#edf7ff]">{contact.ring} ring</span>
                      {contact.status === "review" && (
                        <span className="rounded-md bg-[#e96f80]/15 px-2 py-1 text-xs text-[#ffd9df]">Needs review</span>
                      )}
                    </div>
                    {(contact.email || contact.phone) && (
                      <p className="mt-2 truncate text-xs text-[#7fe6a0]">{[contact.email, contact.phone].filter(Boolean).join(" | ")}</p>
                    )}
                    {contact.campaignNames.length > 0 && (
                      <p className="mt-2 text-xs text-[#f4bd45]">Campaign: {contact.campaignNames.slice(0, 2).join(", ")}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm leading-6 text-[#a8bdd0]">
                High-signal imported contacts will appear here first.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#ffffff]">Import history</p>
                <p className="mt-1 text-xs text-[#a8bdd0]">{importHistory.length} imported document snapshots</p>
              </div>
              {importHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setLatestSubmittedImport(null);
                    onClearHistory();
                  }}
                  className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-[#a8bdd0] transition hover:bg-white/10 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="contained-scroll mt-4 max-h-[220px] space-y-2 overflow-y-auto pr-2">
              {importHistory.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-3 text-sm text-[#a8bdd0]">
                  No imported documents yet.
                </p>
              ) : (
                importHistory.map((result) => (
                  <div key={`${result.sourceName}-${result.parsedAt}`} className="rounded-md bg-white/[0.04] p-3">
                    <p className="truncate text-sm font-semibold text-[#ffffff]">{result.sourceName}</p>
                    <p className="mt-1 text-xs text-[#a8bdd0]">
                      {getSummary(result).contactsImported} contacts | {getSummary(result).duplicatesMerged} duplicates merged
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
