"use client";

import { useMemo, useState } from "react";
import { Building2, Mail, Search, UserRound, UsersRound, X } from "lucide-react";

import type { CampaignInsight, PersonInsight, RelationshipPod } from "@/lib/data/types";
import { cn } from "@/lib/utils/classnames";

interface AllContactsWindowProps {
  campaigns: CampaignInsight[];
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  people: PersonInsight[];
  pods: RelationshipPod[];
  selectedPersonId: string;
}

function getSearchTerms(value: string): string[] {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function getPersonSearchText(person: PersonInsight, podName: string, campaignTitles: string[]): string {
  return [
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
    ...campaignTitles,
  ]
    .join(" ")
    .toLowerCase();
}

function getPluralizedContactCount(count: number): string {
  return `${count} saved contact${count === 1 ? "" : "s"}`;
}

export function AllContactsWindow({
  campaigns,
  onClose,
  onSelectPerson,
  people,
  pods,
  selectedPersonId,
}: AllContactsWindowProps) {
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const podNameById = useMemo(() => new Map(pods.map((pod) => [pod.id, pod.name])), [pods]);
  const campaignTitlesByPersonId = useMemo(() => {
    const index = new Map<string, string[]>();

    campaigns.forEach((campaign) => {
      campaign.targetPeopleIds.forEach((personId) => {
        const currentTitles = index.get(personId) ?? [];
        index.set(personId, [...currentTitles, campaign.title]);
      });
    });

    return index;
  }, [campaigns]);

  const visiblePeople = useMemo(() => {
    const terms = getSearchTerms(submittedQuery);
    const sortedPeople = [...people].sort((left, right) => left.name.localeCompare(right.name));

    if (terms.length === 0) {
      return sortedPeople;
    }

    return sortedPeople
      .map((person) => {
        const podName = podNameById.get(person.podId) ?? "Network";
        const campaignTitles = campaignTitlesByPersonId.get(person.id) ?? [];
        const searchText = getPersonSearchText(person, podName, campaignTitles);

        if (!terms.every((term) => searchText.includes(term))) {
          return null;
        }

        const normalizedQuery = submittedQuery.trim().toLowerCase();
        const startsWithName = person.name.toLowerCase().startsWith(normalizedQuery);

        return {
          person,
          rank: person.socialEquityScore.total + (startsWithName ? 50 : 0),
        };
      })
      .filter((result): result is { person: PersonInsight; rank: number } => Boolean(result))
      .sort((left, right) => right.rank - left.rank || left.person.name.localeCompare(right.person.name))
      .map((result) => result.person);
  }, [campaignTitlesByPersonId, people, podNameById, submittedQuery]);

  const activeSearch = submittedQuery.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4 backdrop-blur-sm">
      <section
        aria-labelledby="all-contacts-title"
        aria-modal="true"
        role="dialog"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#031d35] shadow-2xl"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#2fb65d] text-[#001426]">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7fe6a0]">Contacts</p>
                <h2 id="all-contacts-title" className="text-xl font-semibold text-[#ffffff]">
                  All contacts
                </h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-[#a8bdd0]">
              {getPluralizedContactCount(people.length)} in the active relationship system.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close all contacts"
            title="Close"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-[#a8bdd0] transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form
          role="search"
          aria-label="All contacts search form"
          className="border-b border-white/10 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedQuery(draftQuery);
          }}
        >
          <label htmlFor="all-contacts-search" className="sr-only">
            Search all contacts
          </label>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative min-w-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#79c7ff]"
                aria-hidden="true"
              />
              <input
                id="all-contacts-search"
                type="search"
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="Search by name, company, role, tag, pod, campaign, or email"
                autoComplete="off"
                className="h-11 w-full rounded-md border border-white/10 bg-white/[0.05] px-10 text-sm text-[#ffffff] outline-none transition placeholder:text-[#7fa0b8] focus:border-[#2fb65d]/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-[#2fb65d]/20"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#ffffff] px-4 text-sm font-semibold text-[#001426] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setDraftQuery("");
                setSubmittedQuery("");
              }}
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 px-4 text-sm font-semibold text-[#edf7ff] transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50"
            >
              Clear
            </button>
          </div>
          <p className="mt-3 text-xs text-[#a8bdd0]" aria-live="polite">
            {activeSearch
              ? `Showing ${visiblePeople.length} of ${people.length} contacts for "${activeSearch}".`
              : `Showing all ${people.length} contacts.`}
          </p>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {visiblePeople.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {visiblePeople.map((person) => {
                const podName = podNameById.get(person.podId) ?? "Network";
                const campaignTitles = campaignTitlesByPersonId.get(person.id) ?? [];
                const isSelected = selectedPersonId === person.id;

                return (
                  <button
                    key={person.id}
                    type="button"
                    aria-label={`Open ${person.name} from all contacts`}
                    onClick={() => onSelectPerson(person.id)}
                    className={cn(
                      "min-h-[156px] rounded-md border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#2fb65d]/50",
                      isSelected
                        ? "border-[#2fb65d]/60 bg-[#2fb65d]/12"
                        : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 shrink-0 text-[#f4bd45]" aria-hidden="true" />
                          <span className="truncate text-base font-semibold text-[#ffffff]">{person.name}</span>
                        </div>
                        <p className="mt-1 flex items-center gap-2 text-sm text-[#a8bdd0]">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#7fe6a0]" aria-hidden="true" />
                          <span className="truncate">
                            {person.role}, {person.company}
                          </span>
                        </p>
                        {person.email && (
                          <p className="mt-1 flex items-center gap-2 text-xs text-[#7fe6a0]">
                            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{person.email}</span>
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-sm font-semibold text-[#dfffe8]">
                        {person.socialEquityScore.total}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-[#edf7ff]">
                        {podName}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-[#edf7ff]">
                        {person.category}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-[#edf7ff]">
                        {person.ring} ring
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-[#f4bd45]">
                        {person.socialEquityScore.decayRisk} decay risk
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-[#a8bdd0]">{person.recommendedNextAction}</p>
                    <p className="mt-3 truncate text-xs font-semibold uppercase tracking-[0.12em] text-[#79c7ff]">
                      {campaignTitles.length > 0 ? campaignTitles.slice(0, 2).join(" | ") : "No active campaign"}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-sm font-semibold text-[#ffffff]">No contacts found.</p>
              <p className="mt-2 text-sm text-[#a8bdd0]">Try a different name, company, role, tag, pod, campaign, or email.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
