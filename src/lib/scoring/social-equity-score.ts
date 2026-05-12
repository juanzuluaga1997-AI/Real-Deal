import type { Campaign, Person, SocialEquityScore } from "@/lib/data/types";
import { DEMO_TODAY, daysBetween } from "@/lib/utils/dates";

const weights = {
  relationshipImportance: 0.2,
  recency: 0.16,
  interactionFrequency: 0.12,
  responsiveness: 0.13,
  campaignRelevance: 0.14,
  historyStrength: 0.15,
  decayResistance: 0.1,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateRecencyScore(daysSinceLastInteraction: number, cadenceDays: number): number {
  const ratio = daysSinceLastInteraction / cadenceDays;

  if (ratio <= 0.35) {
    return 100;
  }

  if (ratio <= 0.75) {
    return 86;
  }

  if (ratio <= 1) {
    return 72;
  }

  if (ratio <= 1.5) {
    return 54;
  }

  if (ratio <= 2.5) {
    return 34;
  }

  return 18;
}

function calculateDecayRisk(daysOverdue: number, cadenceDays: number, momentum: Person["momentum"]): number {
  const overduePressure = cadenceDays === 0 ? 0 : (daysOverdue / cadenceDays) * 72;
  const momentumPressure =
    momentum === "at-risk" ? 28 : momentum === "softening" ? 18 : momentum === "steady" ? 8 : 0;

  return clampScore(overduePressure + momentumPressure);
}

function getActiveCampaignRelevance(person: Person, campaigns: Campaign[]): number {
  const activeCampaignIds = new Set(
    campaigns.filter((campaign) => campaign.status === "active" || campaign.status === "planning").map((campaign) => campaign.id),
  );

  return person.campaignRelevance.reduce((highest, relevance) => {
    if (!activeCampaignIds.has(relevance.campaignId)) {
      return highest;
    }

    return Math.max(highest, relevance.relevance);
  }, 0);
}

export function calculateSocialEquityScore(
  person: Person,
  campaigns: Campaign[],
  referenceDate: string | Date = DEMO_TODAY,
): SocialEquityScore {
  const daysSinceLastInteraction = daysBetween(referenceDate, person.lastInteractionDate);
  const daysOverdue = Math.max(0, daysSinceLastInteraction - person.cadenceDays);
  const decayRisk = calculateDecayRisk(daysOverdue, person.cadenceDays, person.momentum);

  const components = {
    relationshipImportance: clampScore((person.relationshipImportance / 10) * 100),
    recency: calculateRecencyScore(daysSinceLastInteraction, person.cadenceDays),
    interactionFrequency: clampScore((person.interactionFrequencyPerMonth / 3) * 100),
    responsiveness: clampScore(person.responsiveness * 100),
    campaignRelevance: getActiveCampaignRelevance(person, campaigns),
    historyStrength: clampScore((person.historyStrength / 10) * 100),
    decayResistance: clampScore(100 - decayRisk),
  };

  const total = clampScore(
    components.relationshipImportance * weights.relationshipImportance +
      components.recency * weights.recency +
      components.interactionFrequency * weights.interactionFrequency +
      components.responsiveness * weights.responsiveness +
      components.campaignRelevance * weights.campaignRelevance +
      components.historyStrength * weights.historyStrength +
      components.decayResistance * weights.decayResistance,
  );

  return {
    total,
    components,
    daysSinceLastInteraction,
    daysOverdue,
    decayRisk,
    cadenceDays: person.cadenceDays,
  };
}

export function getScoreBand(score: number): "excellent" | "healthy" | "watch" | "at-risk" {
  if (score >= 82) {
    return "excellent";
  }

  if (score >= 68) {
    return "healthy";
  }

  if (score >= 52) {
    return "watch";
  }

  return "at-risk";
}
