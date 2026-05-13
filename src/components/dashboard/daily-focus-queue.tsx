import { memo, useMemo } from "react";
import { CheckCircle2, Clock3, Inbox, Target } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Panel } from "@/components/shared/panel";
import { ScoreMeter } from "@/components/shared/score-meter";
import { formatUrgency, StatusBadge } from "@/components/shared/status-badge";
import type { CampaignInsight, DailyRecommendation, PersonInsight } from "@/lib/data/types";
import { cn } from "@/lib/utils/classnames";

interface DailyFocusQueueProps {
  recommendations: DailyRecommendation[];
  people: PersonInsight[];
  campaigns: CampaignInsight[];
  selectedPersonId: string;
  plannedPeople: Record<string, boolean>;
  onSelectPerson: (personId: string) => void;
  onTogglePlanned: (personId: string) => void;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, input, select, textarea"));
}

function DailyFocusQueueComponent({
  recommendations,
  people,
  campaigns,
  selectedPersonId,
  plannedPeople,
  onSelectPerson,
  onTogglePlanned,
}: DailyFocusQueueProps) {
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const campaignsById = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign])), [campaigns]);

  return (
    <Panel eyebrow="Today" icon={Target} title="Daily focus queue">
      {recommendations.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No urgent touches"
          message="Every tracked relationship is inside cadence and no campaign commitment is due."
        />
      ) : (
        <div className="contained-scroll max-h-[560px] space-y-3 overflow-y-auto pr-2 xl:max-h-[calc(100vh-290px)]">
          {recommendations.map((recommendation) => {
            const person = peopleById.get(recommendation.personId);
            const campaign = recommendation.relatedCampaignId ? campaignsById.get(recommendation.relatedCampaignId) : undefined;

            if (!person) {
              return null;
            }

            const isSelected = selectedPersonId === person.id;
            const isPlanned = Boolean(plannedPeople[person.id]);

            return (
              <article
                key={recommendation.personId}
                onMouseDown={(event) => {
                  if (event.button === 0 && !isInteractiveTarget(event.target)) {
                    onSelectPerson(person.id);
                  }
                }}
                onClick={(event) => {
                  if (!isInteractiveTarget(event.target)) {
                    onSelectPerson(person.id);
                  }
                }}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 transition",
                  isSelected ? "border-[#2fb65d]/50 bg-[#2fb65d]/10" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onPointerDown={() => onSelectPerson(person.id)}
                    onClick={() => onSelectPerson(person.id)}
                    className="min-w-0 text-left"
                    aria-pressed={isSelected}
                  >
                    <span className="block truncate text-sm font-semibold text-[#ffffff]">{person.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-[#a8bdd0]">
                      {person.role}, {person.company}
                    </span>
                  </button>
                  <StatusBadge label={formatUrgency(recommendation.urgency)} tone={recommendation.urgency} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#edf7ff]">{recommendation.reason}</p>
                {campaign && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#a8bdd0]">
                    <Clock3 className="h-3.5 w-3.5 text-[#f4bd45]" aria-hidden="true" />
                    <span className="truncate">{campaign.title}</span>
                  </div>
                )}
                <div className="mt-3">
                  <ScoreMeter score={person.socialEquityScore.total} label="Relationship score" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="min-w-0 flex-1 text-xs leading-5 text-[#a8bdd0]">{recommendation.suggestedAction}</p>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onTogglePlanned(person.id);
                    }}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition",
                      isPlanned
                        ? "bg-[#2fb65d]/20 text-[#bcf5ca]"
                        : "bg-[#ffffff] text-[#001426] hover:bg-white",
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {isPlanned ? "Planned" : "Plan"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

export const DailyFocusQueue = memo(DailyFocusQueueComponent);
