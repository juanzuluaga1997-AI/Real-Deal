import { campaigns } from "@/lib/data/mock-data";
import type { CampaignInsight, PersonInsight } from "@/lib/data/types";

export function getCampaigns() {
  return campaigns;
}

export function getCampaignsWithPeople(people: PersonInsight[]): CampaignInsight[] {
  return campaigns.map((campaign) => ({
    ...campaign,
    targetPeople: campaign.targetPeopleIds
      .map((personId) => people.find((person) => person.id === personId))
      .filter(Boolean) as PersonInsight[],
  }));
}

export function getCampaign(campaignId: string) {
  return campaigns.find((campaign) => campaign.id === campaignId);
}
