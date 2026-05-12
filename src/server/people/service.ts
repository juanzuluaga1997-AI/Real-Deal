import { explainSocialEquityScore, suggestNextAction, summarizeRelationshipHistory } from "@/ai/services/relationship-insights";
import { campaigns, people } from "@/lib/data/mock-data";
import type { PersonInsight } from "@/lib/data/types";
import { calculateSocialEquityScore } from "@/lib/scoring/social-equity-score";
import { DEMO_TODAY } from "@/lib/utils/dates";

export function getPeople(): typeof people {
  return people;
}

export async function getPeopleWithInsights(referenceDate: string | Date = DEMO_TODAY): Promise<PersonInsight[]> {
  return Promise.all(
    people.map(async (person) => {
      const socialEquityScore = calculateSocialEquityScore(person, campaigns, referenceDate);
      const relatedCampaigns = campaigns.filter((campaign) =>
        person.campaignRelevance.some((relevance) => relevance.campaignId === campaign.id),
      );

      return {
        ...person,
        socialEquityScore,
        scoreExplanation: await explainSocialEquityScore(person, socialEquityScore),
        historySummary: await summarizeRelationshipHistory(person),
        recommendedNextAction: await suggestNextAction(person, relatedCampaigns),
      };
    }),
  );
}

export async function getPersonWithInsight(personId: string): Promise<PersonInsight | undefined> {
  const peopleWithInsights = await getPeopleWithInsights();
  return peopleWithInsights.find((person) => person.id === personId);
}
