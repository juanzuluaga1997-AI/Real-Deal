import { memo, useMemo } from "react";
import { CalendarDays, Mail, MessageSquare, NotebookText, Tags, UserRound } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Panel } from "@/components/shared/panel";
import { ScoreMeter } from "@/components/shared/score-meter";
import { StatusBadge } from "@/components/shared/status-badge";
import type { CampaignInsight, PersonInsight } from "@/lib/data/types";
import { formatLongDate, formatShortDate } from "@/lib/utils/dates";

interface PersonDetailPanelProps {
  person?: PersonInsight;
  campaigns: CampaignInsight[];
  onSelectCampaign: (campaignId: string) => void;
}

function PersonDetailPanelComponent({ person, campaigns, onSelectCampaign }: PersonDetailPanelProps) {
  const relatedCampaigns = useMemo(
    () => (person ? campaigns.filter((campaign) => campaign.targetPeopleIds.includes(person.id)) : []),
    [campaigns, person],
  );
  const emailInteractions = useMemo(
    () => person?.interactions.filter((interaction) => interaction.source === "gmail" && interaction.type === "email") ?? [],
    [person],
  );

  if (!person) {
    return (
      <Panel title="Person detail" icon={UserRound}>
        <EmptyState icon={UserRound} title="No person selected" message="Select a relationship from the queue or map." />
      </Panel>
    );
  }

  return (
    <Panel eyebrow="Person detail" icon={UserRound} title={person.name}>
      <div
        key={person.id}
        className="contained-scroll max-h-[620px] space-y-5 overflow-y-auto pr-2 xl:max-h-[calc(100vh-290px)]"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={person.category} />
            <StatusBadge label={person.ring === "inner" ? "Inner ring" : person.ring === "core" ? "Core ring" : "Network ring"} />
          </div>
          <p className="mt-3 text-sm leading-6 text-[#e7dfd0]">
            {person.role}, {person.company}
          </p>
          {person.email && (
            <p className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-xs text-[#a9fff0]">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{person.email}</span>
            </p>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <ScoreMeter score={person.socialEquityScore.total} label="Social Equity Score" />
          <p className="mt-4 text-sm leading-6 text-[#d8d2c3]">{person.scoreExplanation}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#fffaf0]">
            <MessageSquare className="h-4 w-4 text-[#6ee7b7]" aria-hidden="true" />
            Recommended next action
          </div>
          <p className="text-sm leading-6 text-[#d8d2c3]">{person.recommendedNextAction}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#fffaf0]">
              <Mail className="h-4 w-4 text-[#7dd3fc]" aria-hidden="true" />
              Email history
            </div>
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#e7dfd0]">
              {emailInteractions.length} synced
            </span>
          </div>
          {emailInteractions.length > 0 ? (
            <div className="space-y-2">
              {emailInteractions.map((interaction) => {
                const direction = interaction.emailDirection === "sent" ? "Sent" : "Received";

                return (
                  <article key={`email-${interaction.id}`} className="rounded-md border border-white/10 bg-[#11100d]/55 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              direction === "Sent"
                                ? "rounded-md border border-[#6ee7b7]/30 bg-[#6ee7b7]/10 px-2 py-1 text-xs font-semibold text-[#bbf7d0]"
                                : "rounded-md border border-[#7dd3fc]/30 bg-[#7dd3fc]/10 px-2 py-1 text-xs font-semibold text-[#bae6fd]"
                            }
                          >
                            {direction}
                          </span>
                          <span className="text-xs text-[#c9c1ad]">Gmail</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold leading-5 text-[#fffaf0]">
                          {interaction.emailSubject ?? interaction.summary}
                        </p>
                      </div>
                      <time className="shrink-0 text-xs text-[#c9c1ad]" dateTime={interaction.date}>
                        {formatShortDate(interaction.date)}
                      </time>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#d8d2c3]">{interaction.outcome}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-3 text-sm leading-6 text-[#c9c1ad]">
              No synced Gmail emails for this contact yet. Run Sync Gmail to load sent and received relationship history.
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#fffaf0]">
            <CalendarDays className="h-4 w-4 text-[#f4c95d]" aria-hidden="true" />
            Timeline
          </div>
          <div className="space-y-3">
            {person.interactions.map((interaction) => (
              <article key={interaction.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#c9c1ad]">{interaction.type}</p>
                  <time className="text-xs text-[#c9c1ad]" dateTime={interaction.date}>
                    {formatShortDate(interaction.date)}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#fffaf0]">{interaction.summary}</p>
                {interaction.source === "gmail" && interaction.emailSubject && (
                  <p className="mt-2 rounded-md bg-[#7dd3fc]/10 px-2 py-1 text-xs leading-5 text-[#bfdbfe]">
                    Gmail {interaction.emailDirection}: {interaction.emailSubject}
                  </p>
                )}
                <p className="mt-2 text-sm leading-6 text-[#c9c1ad]">{interaction.outcome}</p>
                {interaction.nextStep && <p className="mt-2 text-xs leading-5 text-[#a9fff0]">{interaction.nextStep}</p>}
              </article>
            ))}
          </div>
        </div>

        {relatedCampaigns.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-[#fffaf0]">Related campaigns</p>
            <div className="flex flex-wrap gap-2">
              {relatedCampaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => onSelectCampaign(campaign.id)}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#e7dfd0] transition hover:bg-white/10"
                >
                  {campaign.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#fffaf0]">
              <NotebookText className="h-4 w-4 text-[#7dd3fc]" aria-hidden="true" />
              Notes
            </div>
            <p className="text-sm leading-6 text-[#d8d2c3]">{person.notes}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#fffaf0]">
              <Tags className="h-4 w-4 text-[#fb7185]" aria-hidden="true" />
              Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {person.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-white/10 px-2 py-1 text-xs text-[#e7dfd0]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-[#c9c1ad]">
          Last interaction: {formatLongDate(person.lastInteractionDate)}. Expected cadence: every {person.cadenceDays} days.
        </p>
      </div>
    </Panel>
  );
}

export const PersonDetailPanel = memo(PersonDetailPanelComponent);
