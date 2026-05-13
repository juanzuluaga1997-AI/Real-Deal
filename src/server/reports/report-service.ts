import { founderProfile } from "@/lib/data/mock-data";
import type { CampaignInsight, PersonInsight } from "@/lib/data/types";
import { getAppDateString, getCurrentAppDate } from "@/lib/utils/dates";
import { getCampaignsWithPeople } from "@/server/campaigns/service";
import { getPeopleWithInsights } from "@/server/people/service";
import { getDailyFocusRecommendations } from "@/server/recommendations/service";
import type { DashboardReport, ReportHealthOverview, ReportRecommendation } from "./types";

function getHealthOverview(people: PersonInsight[], campaigns: CampaignInsight[]): ReportHealthOverview {
  return {
    averageScore: Math.round(
      people.reduce((total, person) => total + person.socialEquityScore.total, 0) / Math.max(people.length, 1),
    ),
    innerCircleCount: people.filter((person) => person.ring === "inner").length,
    atRiskCount: people.filter((person) => person.socialEquityScore.decayRisk >= 55).length,
    activeCampaignCount: campaigns.filter((campaign) => campaign.status === "active").length,
    trackedPeopleCount: people.length,
  };
}

function getPriorityRelationships(people: PersonInsight[]): PersonInsight[] {
  return [...people]
    .sort((left, right) => {
      if (right.socialEquityScore.decayRisk !== left.socialEquityScore.decayRisk) {
        return right.socialEquityScore.decayRisk - left.socialEquityScore.decayRisk;
      }

      return right.relationshipImportance - left.relationshipImportance;
    })
    .slice(0, 6);
}

function enrichRecommendations(
  recommendations: ReturnType<typeof getDailyFocusRecommendations>,
  people: PersonInsight[],
  campaigns: CampaignInsight[],
): ReportRecommendation[] {
  return recommendations.map((recommendation) => {
    const person = people.find((candidate) => candidate.id === recommendation.personId);
    const campaign = campaigns.find((candidate) => candidate.id === recommendation.relatedCampaignId);

    return {
      ...recommendation,
      personName: person?.name ?? "Unknown person",
      personRole: person?.role ?? "Unknown role",
      personCompany: person?.company ?? "Unknown company",
      relationshipScore: person?.socialEquityScore.total ?? recommendation.score,
      relatedCampaignTitle: campaign?.title,
    };
  });
}

export async function getDashboardReport(referenceDate: string | Date = getCurrentAppDate()): Promise<DashboardReport> {
  const people = await getPeopleWithInsights(referenceDate);
  const campaigns = getCampaignsWithPeople(people);
  const recommendations = getDailyFocusRecommendations(referenceDate);

  return {
    title: "Real Deal Relationship Report",
    generatedAt: getAppDateString(referenceDate),
    founder: founderProfile,
    health: getHealthOverview(people, campaigns),
    recommendations: enrichRecommendations(recommendations, people, campaigns),
    activeCampaigns: campaigns.filter((campaign) => campaign.status === "active" || campaign.status === "planning"),
    priorityRelationships: getPriorityRelationships(people),
  };
}
