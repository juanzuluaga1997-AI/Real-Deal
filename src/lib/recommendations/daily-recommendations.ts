import type { Campaign, DailyRecommendation, Person, RecommendationUrgency } from "@/lib/data/types";
import { calculateSocialEquityScore } from "@/lib/scoring/social-equity-score";
import { DEMO_TODAY, daysBetween, isOnOrBefore } from "@/lib/utils/dates";

interface RecommendationCandidate {
  person: Person;
  relatedCampaignId?: string;
  urgency: RecommendationUrgency;
  priorityScore: number;
  drivers: string[];
  reason: string;
  suggestedAction: string;
}

interface RecommendationOptions {
  limit?: number;
  referenceDate?: string | Date;
}

function clampRecommendationLimit(limit: number): number {
  return Math.max(3, Math.min(5, limit));
}

function getPrimaryCampaign(person: Person, campaigns: Campaign[]): Campaign | undefined {
  const activeCampaignIds = new Set(
    campaigns.filter((campaign) => campaign.status === "active" || campaign.status === "planning").map((campaign) => campaign.id),
  );

  const strongestRelevance = [...person.campaignRelevance]
    .filter((relevance) => activeCampaignIds.has(relevance.campaignId))
    .sort((left, right) => right.relevance - left.relevance)[0];

  return strongestRelevance ? campaigns.find((campaign) => campaign.id === strongestRelevance.campaignId) : undefined;
}

function getUrgency(priorityScore: number, isCommitmentDue: boolean, daysOverdue: number): RecommendationUrgency {
  if (priorityScore >= 86 || (isCommitmentDue && daysOverdue > 7)) {
    return "critical";
  }

  if (priorityScore >= 68 || isCommitmentDue) {
    return "high";
  }

  if (priorityScore >= 48) {
    return "medium";
  }

  return "low";
}

function buildReason(person: Person, primaryCampaign: Campaign | undefined, drivers: string[]): string {
  if (person.followUpDueDate && drivers.includes("follow-up commitment")) {
    return `${person.name} has a follow-up commitment due now, and the relationship is tied to ${primaryCampaign?.title ?? "an active priority"}.`;
  }

  if (person.momentum === "at-risk") {
    return `${person.name} is losing momentum after a long gap, but the relationship still has clear relevance to ${primaryCampaign?.title ?? "the active operating plan"}.`;
  }

  if (person.recentOpportunity) {
    return `${person.name} recently opened a concrete opportunity: ${person.recentOpportunity}`;
  }

  if (primaryCampaign) {
    return `${person.name} matters today because ${primaryCampaign.title} depends on their context, access, or decision support.`;
  }

  return `${person.name} is a high-value relationship whose cadence suggests a timely, lightweight check-in.`;
}

function buildSuggestedAction(person: Person, primaryCampaign: Campaign | undefined): string {
  if (person.nextActionCommitment) {
    return person.nextActionCommitment;
  }

  if (primaryCampaign) {
    return `Send a concise note connected to ${primaryCampaign.title} and ask for one specific next step.`;
  }

  return "Send a short check-in with one specific update and one clear ask.";
}

function buildCandidate(person: Person, campaigns: Campaign[], referenceDate: string | Date): RecommendationCandidate {
  const socialScore = calculateSocialEquityScore(person, campaigns, referenceDate);
  const primaryCampaign = getPrimaryCampaign(person, campaigns);
  const primaryCampaignRelevance = primaryCampaign
    ? person.campaignRelevance.find((relevance) => relevance.campaignId === primaryCampaign.id)?.relevance ?? 0
    : 0;
  const followUpDue = person.followUpDueDate ? isOnOrBefore(person.followUpDueDate, referenceDate) : false;
  const daysSinceLastInteraction = daysBetween(referenceDate, person.lastInteractionDate);
  const overdueRatio = Math.max(0, daysSinceLastInteraction - person.cadenceDays) / person.cadenceDays;

  const drivers = [
    followUpDue ? "follow-up commitment" : undefined,
    socialScore.daysOverdue > 0 ? "overdue cadence" : undefined,
    primaryCampaignRelevance >= 70 ? "active campaign relevance" : undefined,
    person.relationshipImportance >= 8 ? "high relationship importance" : undefined,
    person.momentum === "softening" || person.momentum === "at-risk" ? "declining momentum" : undefined,
    person.recentOpportunity ? "recent opportunity" : undefined,
  ].filter(Boolean) as string[];

  const basePriority =
    16 + overdueRatio * 18 + primaryCampaignRelevance * 0.22 + person.relationshipImportance * 2.1 + socialScore.decayRisk * 0.18;
  const commitmentBonus = followUpDue ? 10 : 0;
  const opportunityBonus = person.recentOpportunity ? 5 : 0;
  const ringBonus = person.ring === "inner" ? 4 : 0;
  const priorityScore = Math.min(100, Math.round(basePriority + commitmentBonus + opportunityBonus + ringBonus));
  const urgency = getUrgency(priorityScore, followUpDue, socialScore.daysOverdue);

  return {
    person,
    relatedCampaignId: primaryCampaign?.id,
    urgency,
    priorityScore,
    drivers,
    reason: buildReason(person, primaryCampaign, drivers),
    suggestedAction: buildSuggestedAction(person, primaryCampaign),
  };
}

export function getDailyRecommendations(
  people: Person[],
  campaigns: Campaign[],
  options: RecommendationOptions = {},
): DailyRecommendation[] {
  const referenceDate = options.referenceDate ?? DEMO_TODAY;
  const limit = clampRecommendationLimit(options.limit ?? 5);

  return people
    .map((person) => buildCandidate(person, campaigns, referenceDate))
    .filter((candidate) => candidate.drivers.length > 0 && candidate.priorityScore >= 44)
    .sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) {
        return right.priorityScore - left.priorityScore;
      }

      return right.person.relationshipImportance - left.person.relationshipImportance;
    })
    .slice(0, limit)
    .map((candidate) => ({
      personId: candidate.person.id,
      urgency: candidate.urgency,
      score: candidate.priorityScore,
      reason: candidate.reason,
      suggestedAction: candidate.suggestedAction,
      relatedCampaignId: candidate.relatedCampaignId,
      drivers: candidate.drivers,
    }));
}
