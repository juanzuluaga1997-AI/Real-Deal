"use client";

import { History, Trash2, UsersRound } from "lucide-react";

import { Panel } from "@/components/shared/panel";
import { ScoreMeter } from "@/components/shared/score-meter";
import { formatLongDate } from "@/lib/utils/dates";

export interface SavedDashboardSnapshot {
  id: string;
  savedAt: string;
  generatedAt: string;
  selectedPersonName: string;
  selectedPersonCompany: string;
  selectedCampaignTitle: string;
  selectedPodName: string;
  plannedTouchCount: number;
  recommendationCount: number;
  averageScore: number;
  atRiskCount: number;
  people: Array<{
    id: string;
    name: string;
    company: string;
    score: number;
    decayRisk: number;
  }>;
}

interface DashboardHistoryProps {
  snapshots: SavedDashboardSnapshot[];
  onClearHistory: () => void;
}

function formatSavedTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardHistory({ snapshots, onClearHistory }: DashboardHistoryProps) {
  return (
    <Panel
      eyebrow="Saved"
      icon={History}
      title="Saved dashboard history"
      action={
        snapshots.length > 0 ? (
          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-[#c9c1ad] transition hover:bg-white/10 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        ) : null
      }
    >
      {snapshots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-[#6ee7b7]">
              <UsersRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#fffaf0]">No saved dashboards yet</p>
              <p className="mt-1 text-sm text-[#c9c1ad]">
                Use Save dashboard to capture the current view and all tracked people.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="contained-scroll max-h-[360px] space-y-3 overflow-y-auto pr-2">
          {snapshots.map((snapshot) => (
            <article key={snapshot.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#fffaf0]">
                    Saved {formatSavedTime(snapshot.savedAt)}
                  </p>
                  <p className="mt-1 text-xs text-[#c9c1ad]">
                    Dashboard date {formatLongDate(snapshot.generatedAt)}
                  </p>
                </div>
                <span className="rounded-md border border-[#6ee7b7]/35 bg-[#6ee7b7]/10 px-2 py-1 text-xs font-semibold text-[#bbf7d0]">
                  {snapshot.people.length} people captured
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <ScoreMeter score={snapshot.averageScore} label="Average score" />
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-md bg-white/[0.04] p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#c9c1ad]">Selected person</p>
                    <p className="mt-1 truncate font-semibold text-[#fffaf0]">{snapshot.selectedPersonName}</p>
                    <p className="mt-0.5 truncate text-xs text-[#c9c1ad]">{snapshot.selectedPersonCompany}</p>
                  </div>
                  <div className="rounded-md bg-white/[0.04] p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#c9c1ad]">Context</p>
                    <p className="mt-1 truncate font-semibold text-[#fffaf0]">{snapshot.selectedCampaignTitle}</p>
                    <p className="mt-0.5 text-xs text-[#c9c1ad]">
                      {snapshot.selectedPodName} pod, {snapshot.atRiskCount} at risk
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {snapshot.people.slice(0, 6).map((person) => (
                  <span key={person.id} className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#e7dfd0]">
                    {person.name} {person.score}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
