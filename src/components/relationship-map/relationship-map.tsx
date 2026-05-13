"use client";

import type { CSSProperties } from "react";
import { memo, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Network } from "lucide-react";

import { Panel } from "@/components/shared/panel";
import type { CampaignAction, CampaignInsight, Interaction, PersonInsight, RelationshipPod, RelationshipRing } from "@/lib/data/types";
import { cn } from "@/lib/utils/classnames";
import { formatLongDate } from "@/lib/utils/dates";

interface RelationshipMapProps {
  campaigns: CampaignInsight[];
  people: PersonInsight[];
  pods: RelationshipPod[];
  selectedPersonId: string;
  selectedPodId: string;
  onSelectPerson: (personId: string) => void;
  onSelectPod: (podId: string) => void;
  compact?: boolean;
  referenceDate: string;
}

const ringRadius: Record<RelationshipRing, number> = {
  inner: 20,
  core: 33,
  network: 45,
};

const ringSize: Record<RelationshipRing, number> = {
  inner: 54,
  core: 46,
  network: 38,
};

interface MapNode {
  person: PersonInsight;
  style: CSSProperties;
}

interface RelationshipCalendarProps {
  campaigns: CampaignInsight[];
  people: PersonInsight[];
  podsById: Map<string, RelationshipPod>;
  selectedPersonId: string;
  onSelectPerson: (personId: string) => void;
  referenceDate: string;
}

type CalendarEventKind = "campaign-action" | "follow-up" | "interaction";

interface RelationshipCalendarEvent {
  id: string;
  date: string;
  kind: CalendarEventKind;
  label: string;
  detail: string;
  accentColor: string;
  person: PersonInsight;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const calendarEventKindRank: Record<CalendarEventKind, number> = {
  "campaign-action": 0,
  "follow-up": 1,
  interaction: 2,
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function getAngleOffset(ring: RelationshipRing): number {
  if (ring === "inner") {
    return -76;
  }

  if (ring === "core") {
    return -42;
  }

  return -18;
}

function normalizeCalendarDate(date: string): string {
  return date.slice(0, 10);
}

function getMonthKey(date: string): string {
  return normalizeCalendarDate(date).slice(0, 7);
}

function getMonthLabel(monthKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthKey}-01T12:00:00.000Z`));
}

function getMonthParts(monthKey: string): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split("-").map(Number);

  return { year, monthIndex: month - 1 };
}

function getAdjacentMonthKey(monthKey: string, offset: number): string {
  const { year, monthIndex } = getMonthParts(monthKey);
  const nextDate = new Date(Date.UTC(year, monthIndex + offset, 1));
  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, "0");

  return `${nextYear}-${nextMonth}`;
}

function getCalendarDate(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(monthKey: string): number {
  const { year, monthIndex } = getMonthParts(monthKey);

  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function getFirstWeekdayOffset(monthKey: string): number {
  const { year, monthIndex } = getMonthParts(monthKey);

  return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
}

function addUtcDays(date: string, days: number): string {
  const [year, month, day] = normalizeCalendarDate(date).split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(nextDate.getUTCDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function getFollowUpDate(person: PersonInsight): string {
  return person.followUpDueDate ?? addUtcDays(person.lastInteractionDate, person.cadenceDays);
}

function formatInteractionLabel(interaction: Interaction): string {
  if (interaction.source === "gmail" && interaction.emailDirection) {
    return interaction.emailDirection === "sent" ? "Sent email" : "Received email";
  }

  return `${interaction.type[0].toUpperCase()}${interaction.type.slice(1)}`;
}

function doesActionReferencePerson(action: CampaignAction, person: PersonInsight): boolean {
  const normalizedActionLabel = action.label.toLowerCase();
  const [firstName] = person.name.toLowerCase().split(" ");

  return (
    normalizedActionLabel.includes(person.name.toLowerCase()) ||
    normalizedActionLabel.includes(firstName) ||
    normalizedActionLabel.includes(person.company.toLowerCase())
  );
}

function buildCalendarEvents(
  campaigns: CampaignInsight[],
  people: PersonInsight[],
  podsById: Map<string, RelationshipPod>,
): RelationshipCalendarEvent[] {
  const visiblePeopleById = new Map(people.map((person) => [person.id, person]));
  const relationshipEvents = people.flatMap((person) => {
      const pod = podsById.get(person.podId);
      const accentColor = pod?.color ?? "#2fb65d";
      const events: RelationshipCalendarEvent[] = [
        {
          id: `${person.id}-follow-up`,
          date: getFollowUpDate(person),
          kind: "follow-up",
          label: "Follow-up due",
          detail: person.nextActionCommitment ?? person.recommendedNextAction,
          accentColor,
          person,
        },
      ];

      person.interactions.forEach((interaction) => {
        const interactionLabel = formatInteractionLabel(interaction);
        const detail = interaction.emailSubject
          ? `${interaction.emailSubject}. ${interaction.summary}`
          : `${interaction.summary} ${interaction.outcome}`;

        events.push({
          id: interaction.id,
          date: normalizeCalendarDate(interaction.date),
          kind: "interaction",
          label: interactionLabel,
          detail,
          accentColor,
          person,
        });
      });

      return events;
    });
  const campaignEvents = campaigns.flatMap((campaign) =>
    campaign.nextActions.flatMap((action) => {
      const visibleTargetPeople = campaign.targetPeople
        .map((targetPerson) => visiblePeopleById.get(targetPerson.id))
        .filter((person): person is PersonInsight => Boolean(person));
      const actionPerson = visibleTargetPeople.find((person) => doesActionReferencePerson(action, person)) ?? visibleTargetPeople[0];

      if (!actionPerson) {
        return [];
      }

      const pod = podsById.get(actionPerson.podId);

      return [
        {
          id: action.id,
          date: action.dueDate,
          kind: "campaign-action" as const,
          label: "Campaign action",
          detail: `${campaign.title}: ${action.label}`,
          accentColor: pod?.color ?? "#2fb65d",
          person: actionPerson,
        },
      ];
    }),
  );

  return [...relationshipEvents, ...campaignEvents]
    .sort((firstEvent, secondEvent) => {
      if (firstEvent.date !== secondEvent.date) {
        return firstEvent.date.localeCompare(secondEvent.date);
      }

      if (firstEvent.kind !== secondEvent.kind) {
        return calendarEventKindRank[firstEvent.kind] - calendarEventKindRank[secondEvent.kind];
      }

      return secondEvent.person.socialEquityScore.total - firstEvent.person.socialEquityScore.total;
    });
}

function getEventCountLabel(count: number): string {
  return `${count} relationship ${count === 1 ? "event" : "events"}`;
}

function RelationshipCalendar({ campaigns, people, podsById, selectedPersonId, onSelectPerson, referenceDate }: RelationshipCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthKey(referenceDate));
  const [selectedDate, setSelectedDate] = useState(referenceDate);

  const events = useMemo(() => buildCalendarEvents(campaigns, people, podsById), [campaigns, people, podsById]);
  const eventsByDate = useMemo(() => {
    return events.reduce((groupedEvents, event) => {
      const dateEvents = groupedEvents.get(event.date) ?? [];
      dateEvents.push(event);
      groupedEvents.set(event.date, dateEvents);

      return groupedEvents;
    }, new Map<string, RelationshipCalendarEvent[]>());
  }, [events]);
  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedPersonId),
    [people, selectedPersonId],
  );
  const selectedPersonEvents = useMemo(
    () => events.filter((event) => event.person.id === selectedPersonId),
    [events, selectedPersonId],
  );
  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];
  const monthDays = useMemo(() => Array.from({ length: getDaysInMonth(visibleMonth) }, (_, index) => index + 1), [visibleMonth]);
  const firstWeekdayOffset = useMemo(() => getFirstWeekdayOffset(visibleMonth), [visibleMonth]);
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => event.date >= referenceDate)
        .sort((firstEvent, secondEvent) => firstEvent.date.localeCompare(secondEvent.date))
        .slice(0, 4),
    [events, referenceDate],
  );

  function openAdjacentMonth(offset: number) {
    const nextMonth = getAdjacentMonthKey(visibleMonth, offset);
    const firstEventInMonth = events.find((event) => getMonthKey(event.date) === nextMonth);

    setVisibleMonth(nextMonth);
    setSelectedDate(firstEventInMonth?.date ?? getCalendarDate(nextMonth, 1));
  }

  function openSelectedPersonDate() {
    const nextEvent = selectedPersonEvents.find((event) => event.date >= referenceDate) ?? selectedPersonEvents[0];

    if (!nextEvent) {
      return;
    }

    setVisibleMonth(getMonthKey(nextEvent.date));
    setSelectedDate(nextEvent.date);
  }

  return (
    <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4" aria-labelledby="relationship-calendar-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7fe6a0]">Calendar</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-[#f4bd45]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 id="relationship-calendar-title" className="text-base font-semibold text-[#ffffff]">
              Relationship calendar
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAdjacentMonth(-1)}
            aria-label="Previous month"
            title="Previous month"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-[#a8bdd0] transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-36 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-semibold text-[#ffffff]">
            {getMonthLabel(visibleMonth)}
          </div>
          <button
            type="button"
            onClick={() => openAdjacentMonth(1)}
            aria-label="Next month"
            title="Next month"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-[#a8bdd0] transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7fa0b8]">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekdayOffset }, (_, index) => (
              <span key={`blank-${index}`} className="min-h-[74px] rounded-md border border-transparent" aria-hidden="true" />
            ))}
            {monthDays.map((day) => {
              const date = getCalendarDate(visibleMonth, day);
              const dateEvents = eventsByDate.get(date) ?? [];
              const isSelectedDate = selectedDate === date;
              const isToday = date === referenceDate;
              const hasSelectedPersonEvent = dateEvents.some((event) => event.person.id === selectedPersonId);
              const visibleEvents = dateEvents.slice(0, 2);

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  aria-label={`${formatLongDate(date)}, ${getEventCountLabel(dateEvents.length)}`}
                  className={cn(
                    "flex min-h-[74px] min-w-0 flex-col rounded-md border p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50 sm:min-h-[88px]",
                    isSelectedDate
                      ? "border-[#2fb65d]/60 bg-[#2fb65d]/12"
                      : hasSelectedPersonEvent
                        ? "border-[#f4bd45]/50 bg-[#f4bd45]/8 hover:bg-[#f4bd45]/12"
                        : "border-white/10 bg-[#001a2f] hover:bg-white/[0.06]",
                  )}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-[#ffffff]">{day}</span>
                    {isToday && (
                      <>
                        <span className="h-2 w-2 rounded-full bg-[#2fb65d] sm:hidden" aria-hidden="true" />
                        <span className="hidden rounded-sm bg-[#2fb65d]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#dfffe8] sm:inline">
                          Today
                        </span>
                      </>
                    )}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {dateEvents.slice(0, 4).map((event) => (
                      <span
                        key={`${date}-${event.id}-dot`}
                        className={cn("h-1.5 w-1.5 rounded-full", event.kind === "follow-up" ? "ring-1 ring-white/30" : "")}
                        style={{ backgroundColor: event.accentColor }}
                      />
                    ))}
                  </span>
                  <span className="mt-2 hidden min-w-0 flex-col gap-1 sm:flex">
                    {visibleEvents.map((event) => (
                      <span
                        key={`${date}-${event.id}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-sm bg-white/[0.06] px-1.5 py-1 text-[10px] font-semibold text-[#edf7ff]"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: event.accentColor }} />
                        <span className="truncate">{event.person.name}</span>
                      </span>
                    ))}
                    {dateEvents.length > visibleEvents.length && (
                      <span className="text-[10px] font-semibold text-[#7fe6a0]">+{dateEvents.length - visibleEvents.length} more</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-lg border border-white/10 bg-[#03233f] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#a8bdd0]">Selected day</p>
          <p className="mt-1 text-lg font-semibold text-[#ffffff]">{formatLongDate(selectedDate)}</p>
          <div className="mt-4 flex flex-col gap-2">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((event) => (
                <button
                  key={`${selectedDate}-${event.id}-agenda`}
                  type="button"
                  onClick={() => onSelectPerson(event.person.id)}
                  aria-label={`Open ${event.person.name} from calendar event`}
                  className={cn(
                    "rounded-md border p-3 text-left transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50",
                    event.person.id === selectedPersonId ? "border-[#2fb65d]/50 bg-[#2fb65d]/10" : "border-white/10 bg-white/[0.035]",
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-[#ffffff]">{event.person.name}</span>
                    <span className="shrink-0 rounded-sm bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a8bdd0]">
                      {event.label}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#7fe6a0]">{event.person.company}</span>
                  <span className="mt-2 block text-sm leading-6 text-[#edf7ff]">{event.detail}</span>
                </button>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-[#a8bdd0]">
                No relationship activity is scheduled for this date.
              </div>
            )}
          </div>

          {selectedPerson && selectedPersonEvents.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#a8bdd0]">Selected relationship</p>
              <button
                type="button"
                onClick={openSelectedPersonDate}
                className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.035] p-3 text-left transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
              >
                <span className="block text-sm font-semibold text-[#ffffff]">{selectedPerson.name}</span>
                <span className="mt-1 block text-xs leading-5 text-[#a8bdd0]">
                  {selectedPersonEvents.length} calendar {selectedPersonEvents.length === 1 ? "entry" : "entries"}
                </span>
              </button>
            </div>
          )}

          {upcomingEvents.length > 0 && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#a8bdd0]">Upcoming</p>
              <div className="mt-2 flex flex-col gap-2">
                {upcomingEvents.map((event) => (
                  <button
                    key={`upcoming-${event.id}`}
                    type="button"
                    onClick={() => {
                      setVisibleMonth(getMonthKey(event.date));
                      setSelectedDate(event.date);
                      onSelectPerson(event.person.id);
                    }}
                    className="flex items-start gap-2 rounded-md px-2 py-2 text-left transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: event.accentColor }} />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-[#ffffff]">{formatLongDate(event.date)}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#a8bdd0]">{event.person.name}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function RelationshipMapComponent({
  campaigns,
  people,
  pods,
  selectedPersonId,
  selectedPodId,
  onSelectPerson,
  onSelectPod,
  compact = false,
  referenceDate,
}: RelationshipMapProps) {
  const podsById = useMemo(() => new Map(pods.map((pod) => [pod.id, pod])), [pods]);
  const selectedPodName = selectedPodId === "all" ? "All pods" : podsById.get(selectedPodId)?.name;
  const visiblePeople = useMemo(
    () => (selectedPodId === "all" ? people : people.filter((person) => person.podId === selectedPodId)),
    [people, selectedPodId],
  );
  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedPersonId),
    [people, selectedPersonId],
  );
  const mapNodes = useMemo(() => {
    const peopleByRing: Record<RelationshipRing, PersonInsight[]> = {
      inner: visiblePeople.filter((person) => person.ring === "inner"),
      core: visiblePeople.filter((person) => person.ring === "core"),
      network: visiblePeople.filter((person) => person.ring === "network"),
    };

    return (Object.keys(peopleByRing) as RelationshipRing[]).flatMap((ring) => {
      const ringPeople = peopleByRing[ring];

      return ringPeople.map((person, index): MapNode => {
        const pod = podsById.get(person.podId);
        const angle = getAngleOffset(ring) + (360 / Math.max(ringPeople.length, 1)) * index;
        const radians = (angle * Math.PI) / 180;
        const x = 50 + Math.cos(radians) * ringRadius[ring];
        const y = 50 + Math.sin(radians) * ringRadius[ring];
        const size = ringSize[ring] + Math.round(person.socialEquityScore.total / 18);

        return {
          person,
          style: {
            "--orb-color": pod?.color ?? "#ffffff",
            left: `calc(${x}% - ${size / 2}px)`,
            top: `calc(${y}% - ${size / 2}px)`,
            width: `${size}px`,
            height: `${size}px`,
          } as CSSProperties,
        };
      });
    });
  }, [podsById, visiblePeople]);

  return (
    <Panel
      eyebrow="Map"
      icon={Network}
      title="Relationship map"
      className={compact ? undefined : "min-h-[660px]"}
      action={
        <div className="flex items-center gap-2 text-xs text-[#a8bdd0]">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{selectedPodName}</span>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectPod("all")}
          className={cn(
            "rounded-md border px-3 py-2 text-xs font-semibold transition",
            selectedPodId === "all" ? "border-white/40 bg-white/15 text-white" : "border-white/10 text-[#a8bdd0] hover:bg-white/10",
          )}
        >
          All pods
        </button>
        {pods.map((pod) => (
          <button
            key={pod.id}
            type="button"
            onClick={() => onSelectPod(pod.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition",
              selectedPodId === pod.id
                ? "border-white/40 bg-white/15 text-white"
                : "border-white/10 text-[#a8bdd0] hover:bg-white/10",
            )}
          >
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: pod.color }} />
            {pod.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(360px,1fr)_220px]">
        <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-white/10 bg-[#000f1c] p-3 sm:min-h-[520px]">
          <div className="absolute inset-[14%] rounded-full border border-[#2fb65d]/24" />
          <div className="absolute inset-[25%] rounded-full border border-[#f4bd45]/20" />
          <div className="absolute inset-[38%] rounded-full border border-[#e96f80]/18" />
          <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-center text-xs font-semibold text-[#ffffff] shadow-2xl">
            Avery
          </div>

          {mapNodes.map(({ person, style }) => {
            const isSelected = selectedPersonId === person.id;

            return (
              <button
                key={person.id}
                type="button"
                onPointerDown={() => onSelectPerson(person.id)}
                onClick={() => onSelectPerson(person.id)}
                className={cn(
                  "orb-glass absolute flex items-center justify-center rounded-full border text-xs font-bold text-[#001426]",
                  isSelected ? "z-20 scale-110 border-white" : "z-10 border-white/30 hover:scale-105",
                )}
                style={style}
                aria-label={`Open ${person.name}`}
                title={`${person.name}: ${person.socialEquityScore.total}`}
              >
                {getInitials(person.name)}
              </button>
            );
          })}
        </div>

        <aside className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#a8bdd0]">Selected</p>
          {selectedPerson ? (
            <div className="mt-3">
              <p className="text-lg font-semibold text-[#ffffff]">{selectedPerson.name}</p>
              <p className="mt-1 text-sm leading-6 text-[#a8bdd0]">
                {selectedPerson.role}, {selectedPerson.company}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-white/[0.05] p-3">
                  <p className="font-mono text-xl font-semibold text-[#2fb65d]">{selectedPerson.socialEquityScore.total}</p>
                  <p className="text-xs text-[#a8bdd0]">Score</p>
                </div>
                <div className="rounded-md bg-white/[0.05] p-3">
                  <p className="font-mono text-xl font-semibold text-[#f4bd45]">{selectedPerson.socialEquityScore.decayRisk}</p>
                  <p className="text-xs text-[#a8bdd0]">Decay risk</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#edf7ff]">{selectedPerson.recommendedNextAction}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#a8bdd0]">Select a person to inspect the relationship.</p>
          )}
        </aside>
      </div>

      <RelationshipCalendar
        campaigns={campaigns}
        onSelectPerson={onSelectPerson}
        people={visiblePeople}
        podsById={podsById}
        referenceDate={referenceDate}
        selectedPersonId={selectedPersonId}
      />
    </Panel>
  );
}

export const RelationshipMap = memo(RelationshipMapComponent);
