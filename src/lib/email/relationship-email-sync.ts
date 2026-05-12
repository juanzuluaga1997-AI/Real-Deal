import type { CampaignInsight, DailyRecommendation, Interaction, Person, PersonInsight } from "@/lib/data/types";
import type { EmailSyncResult, ContactEmailEvent } from "@/lib/email/types";
import { getDailyRecommendations } from "@/lib/recommendations/daily-recommendations";
import { calculateSocialEquityScore } from "@/lib/scoring/social-equity-score";
import { formatLongDate } from "@/lib/utils/dates";

interface EmailEnrichedRelationshipStateInput {
  people: PersonInsight[];
  campaigns: CampaignInsight[];
  recommendations: DailyRecommendation[];
  emailSyncResult: EmailSyncResult | null;
  referenceDate: string;
}

interface EmailEnrichedRelationshipState {
  people: PersonInsight[];
  campaigns: CampaignInsight[];
  recommendations: DailyRecommendation[];
}

function getEventDate(event: ContactEmailEvent): string {
  return event.date.slice(0, 10);
}

function getLatestDate(left: string, right: string): string {
  return new Date(left) >= new Date(right) ? left : right;
}

function getMomentumFromEmailActivity(person: PersonInsight, latestEmailDate: string, referenceDate: string): Person["momentum"] {
  const daysSinceLatestEmail = Math.max(
    0,
    Math.round((new Date(`${referenceDate}T00:00:00.000Z`).getTime() - new Date(`${latestEmailDate}T00:00:00.000Z`).getTime()) / 86_400_000),
  );

  if (daysSinceLatestEmail <= 14) {
    return "gaining";
  }

  if (daysSinceLatestEmail <= person.cadenceDays) {
    return "steady";
  }

  return person.momentum;
}

function eventToInteraction(event: ContactEmailEvent, person: PersonInsight): Interaction {
  const directionLabel = event.direction === "sent" ? "Sent" : "Received";
  const contactLabel = event.contactEmail ? `${person.name} at ${event.contactEmail}` : person.name;

  return {
    id: event.id,
    date: getEventDate(event),
    type: "email",
    source: "gmail",
    emailDirection: event.direction,
    emailSubject: event.subject,
    summary: `${directionLabel} Gmail email with ${contactLabel}: ${event.subject}`,
    outcome: event.snippet || "Gmail message was synced into the relationship history.",
  };
}

function buildEmailNotes(person: PersonInsight, events: ContactEmailEvent[]): string {
  if (events.length === 0) {
    return person.notes;
  }

  const latestEvent = events.reduce((latest, event) => (new Date(event.date) > new Date(latest.date) ? event : latest), events[0]);
  const emailNote = `Gmail history: ${events.length} email message${events.length === 1 ? "" : "s"} synced. Latest email: ${formatLongDate(
    getEventDate(latestEvent),
  )}, "${latestEvent.subject}".`;

  const baseNotes = person.notes.replace(/\s*Gmail history:[\s\S]*$/, "").trim();
  return `${baseNotes} ${emailNote}`.trim();
}

function enrichPersonWithEmail(person: PersonInsight, events: ContactEmailEvent[], campaigns: CampaignInsight[], referenceDate: string): PersonInsight {
  if (events.length === 0) {
    return person;
  }

  const existingInteractionIds = new Set(person.interactions.map((interaction) => interaction.id));
  const emailInteractions = events
    .filter((event) => !existingInteractionIds.has(event.id))
    .map((event) => eventToInteraction(event, person));
  const interactions = [...emailInteractions, ...person.interactions].sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  );
  const latestEmailDate = events.map(getEventDate).reduce(getLatestDate, person.lastInteractionDate);
  const lastInteractionDate = getLatestDate(person.lastInteractionDate, latestEmailDate);
  const receivedCount = events.filter((event) => event.direction === "received").length;
  const updatedPerson: Person = {
    ...person,
    lastInteractionDate,
    interactionFrequencyPerMonth: Math.min(6, person.interactionFrequencyPerMonth + events.length / 3),
    responsiveness: receivedCount > 0 ? Math.max(person.responsiveness, Math.min(0.96, 0.68 + receivedCount * 0.05)) : person.responsiveness,
    historyStrength: Math.min(10, person.historyStrength + Math.min(2, events.length * 0.35)),
    momentum: getMomentumFromEmailActivity(person, latestEmailDate, referenceDate),
    notes: buildEmailNotes(person, events),
    tags: Array.from(new Set([...person.tags, "Gmail synced"])),
    interactions,
  };
  const socialEquityScore = calculateSocialEquityScore(updatedPerson, campaigns, referenceDate);
  const latestInteraction = interactions[0];

  return {
    ...updatedPerson,
    socialEquityScore,
    scoreExplanation: `${updatedPerson.name} has a Social Equity Score of ${socialEquityScore.total}. Gmail activity is included in recency, interaction frequency, responsiveness, and history strength.`,
    historySummary: latestInteraction
      ? `${updatedPerson.name}'s latest relationship context is a ${latestInteraction.type}: ${latestInteraction.summary}. ${latestInteraction.outcome}`
      : person.historySummary,
    recommendedNextAction:
      updatedPerson.nextActionCommitment ?? "Send a concise follow-up that references the latest Gmail context and asks for one clear next step.",
  };
}

function attachPeopleToCampaigns(campaigns: CampaignInsight[], people: PersonInsight[]): CampaignInsight[] {
  return campaigns.map((campaign) => ({
    ...campaign,
    targetPeople: campaign.targetPeopleIds
      .map((personId) => people.find((person) => person.id === personId))
      .filter(Boolean) as PersonInsight[],
  }));
}

export function buildEmailEnrichedRelationshipState({
  people,
  campaigns,
  recommendations,
  emailSyncResult,
  referenceDate,
}: EmailEnrichedRelationshipStateInput): EmailEnrichedRelationshipState {
  if (!emailSyncResult || emailSyncResult.events.length === 0) {
    return { people, campaigns, recommendations };
  }

  const eventsByPersonId = new Map<string, ContactEmailEvent[]>();
  emailSyncResult.events.forEach((event) => {
    const events = eventsByPersonId.get(event.personId) ?? [];
    events.push(event);
    eventsByPersonId.set(event.personId, events);
  });

  const enrichedPeople = people.map((person) =>
    enrichPersonWithEmail(person, eventsByPersonId.get(person.id) ?? [], campaigns, referenceDate),
  );
  const enrichedCampaigns = attachPeopleToCampaigns(campaigns, enrichedPeople);
  const enrichedRecommendations = getDailyRecommendations(enrichedPeople, enrichedCampaigns, { referenceDate, limit: 5 });

  return {
    people: enrichedPeople,
    campaigns: enrichedCampaigns,
    recommendations: enrichedRecommendations,
  };
}
