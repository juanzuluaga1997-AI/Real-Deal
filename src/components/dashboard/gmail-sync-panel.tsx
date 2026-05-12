"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Mail, RefreshCw, ShieldCheck, X } from "lucide-react";

import { Panel } from "@/components/shared/panel";
import { cn } from "@/lib/utils/classnames";
import type { PersonInsight } from "@/lib/data/types";
import type { ContactEmailSyncTarget, EmailSyncResult, GmailIntegrationStatus } from "@/lib/email/types";

interface GmailSyncPanelProps {
  people: PersonInsight[];
  latestSync: EmailSyncResult | null;
  onClose: () => void;
  onSynced: (result: EmailSyncResult) => void;
}

type SyncStatus =
  | { state: "idle"; message: string }
  | { state: "loading"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

function getContactTargets(people: PersonInsight[]): ContactEmailSyncTarget[] {
  return people.map((person) => ({
    personId: person.id,
    name: person.name,
    company: person.company,
    email: person.email,
    lastInteractionDate: person.lastInteractionDate,
  }));
}

function formatSyncMode(status: GmailIntegrationStatus | null): string {
  if (!status) {
    return "Checking";
  }

  if (status.configured) {
    return "Read-only Gmail";
  }

  return status.canConnect ? "Ready to connect" : "Setup needed";
}

function formatTokenStorage(status: GmailIntegrationStatus): string {
  if (status.tokenStorage === "environment") {
    return "environment secrets";
  }

  if (status.tokenStorage === "local-private-file") {
    return "a private local file";
  }

  return "not connected";
}

export function GmailSyncPanel({ people, latestSync, onClose, onSynced }: GmailSyncPanelProps) {
  const [gmailStatus, setGmailStatus] = useState<GmailIntegrationStatus | null>(null);
  const [lookbackDays, setLookbackDays] = useState("0");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: "idle",
    message: "Gmail sync is ready.",
  });
  const contactTargets = useMemo(() => getContactTargets(people), [people]);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/integrations/gmail/status");
        const payload = (await response.json()) as { status?: GmailIntegrationStatus };
        if (isMounted && payload.status) {
          setGmailStatus(payload.status);
        }
      } catch {
        if (isMounted) {
          setSyncStatus({ state: "error", message: "Gmail status could not be checked." });
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSync() {
    setSyncStatus({ state: "loading", message: "Reading Gmail relationship history." });

    try {
      const response = await fetch("/api/integrations/gmail/sync", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contacts: contactTargets,
          lookbackDays: Number(lookbackDays),
          maxMessagesPerContact: 0,
        }),
      });
      const payload = (await response.json()) as { result?: EmailSyncResult; error?: string };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Unable to sync Gmail relationship history.");
      }

      onSynced(payload.result);
      setSyncStatus({
        state: "success",
        message: `Synced ${payload.result.summary.messagesImported} Gmail email${
          payload.result.summary.messagesImported === 1 ? "" : "s"
        } across ${payload.result.summary.matchedContacts} relationship${payload.result.summary.matchedContacts === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setSyncStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Unable to sync Gmail relationship history.",
      });
    }
  }

  return (
    <Panel
      eyebrow="Gmail"
      icon={Mail}
      title="Gmail relationship sync"
      action={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-[#c9c1ad] transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Close
        </button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(360px,1fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-[#fffaf0]">
                {gmailStatus?.configured ? (
                  <CheckCircle2 className="h-4 w-4 text-[#6ee7b7]" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-[#f4c95d]" aria-hidden="true" />
                )}
                {formatSyncMode(gmailStatus)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-[#e7dfd0]">
                <ShieldCheck className="h-4 w-4 text-[#7dd3fc]" aria-hidden="true" />
                Read-only access
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#c9c1ad]">
              Account identity is authorized through Google at runtime and is not stored in source code.
            </p>
            {gmailStatus?.configured && (
              <p className="mt-3 rounded-md border border-[#6ee7b7]/25 bg-[#6ee7b7]/10 p-3 text-sm leading-6 text-[#bbf7d0]">
                Gmail is connected with read-only access. The connection is stored in {formatTokenStorage(gmailStatus)}.
              </p>
            )}
            {gmailStatus && !gmailStatus.configured && gmailStatus.canConnect && (
              <a
                href={gmailStatus.connectUrl}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#7dd3fc] px-4 py-3 text-sm font-semibold text-[#11100d] transition hover:bg-[#bae6fd]"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Connect Gmail
              </a>
            )}
            {gmailStatus && gmailStatus.missingFields.length > 0 && (
              <p className="mt-3 rounded-md border border-[#f4c95d]/30 bg-[#f4c95d]/10 p-3 text-sm leading-6 text-[#f9e6a2]">
                Missing setup: {gmailStatus.missingFields.join(", ")}. Demo sync will run until Gmail OAuth setup is complete.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <label htmlFor="gmail-lookback-days" className="block text-xs font-medium uppercase tracking-[0.16em] text-[#c9c1ad]">
              Email lookback
            </label>
            <select
              id="gmail-lookback-days"
              value={lookbackDays}
              onChange={(event) => setLookbackDays(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-[#11100d] px-3 py-2 text-sm font-semibold text-[#fffaf0]"
            >
              <option value="0">All available email</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 180 days</option>
              <option value="365">Last 12 months</option>
            </select>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncStatus.state === "loading"}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#6ee7b7] px-4 py-3 text-sm font-semibold text-[#11100d] transition hover:bg-[#a9fff0] disabled:bg-white/20 disabled:text-[#c9c1ad]"
            >
              <RefreshCw className={cn("h-4 w-4", syncStatus.state === "loading" && "animate-spin")} aria-hidden="true" />
              Run sync
            </button>
            <p
              className={cn(
                "mt-3 rounded-lg border p-3 text-sm leading-6",
                syncStatus.state === "success"
                  ? "border-[#6ee7b7]/30 bg-[#6ee7b7]/10 text-[#bbf7d0]"
                  : syncStatus.state === "error"
                    ? "border-[#fb7185]/35 bg-[#fb7185]/10 text-[#fecdd3]"
                    : "border-white/10 bg-white/[0.035] text-[#c9c1ad]",
              )}
              role={syncStatus.state === "error" ? "alert" : "status"}
            >
              {syncStatus.message}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-[#fffaf0]">Sync summary</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs text-[#c9c1ad]">Tracked relationships</p>
                <p className="mt-2 font-mono text-xl font-semibold text-[#fffaf0]">{contactTargets.length}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs text-[#c9c1ad]">Emails imported</p>
                <p className="mt-2 font-mono text-xl font-semibold text-[#fffaf0]">{latestSync?.summary.messagesImported ?? 0}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs text-[#c9c1ad]">Matched relationships</p>
                <p className="mt-2 font-mono text-xl font-semibold text-[#fffaf0]">{latestSync?.summary.matchedContacts ?? 0}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                <p className="text-xs text-[#c9c1ad]">Mode</p>
                <p className="mt-2 text-sm font-semibold text-[#fffaf0]">{latestSync?.summary.mode ?? gmailStatus?.mode ?? "checking"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm font-semibold text-[#fffaf0]">Recent Gmail evidence</p>
            <div className="contained-scroll mt-4 max-h-[260px] space-y-2 overflow-y-auto pr-2">
              {!latestSync || latestSync.events.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-3 text-sm text-[#c9c1ad]">
                  Gmail email history will appear here after a sync.
                </p>
              ) : (
                latestSync.events.slice(0, 8).map((event) => {
                  const person = people.find((candidate) => candidate.id === event.personId);

                  return (
                    <article key={event.id} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-[#fffaf0]">{person?.name ?? "Matched contact"}</p>
                        <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#e7dfd0]">{event.direction}</span>
                      </div>
                      <p className="mt-2 truncate text-sm text-[#d8d2c3]">{event.subject}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#c9c1ad]">{event.snippet}</p>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
