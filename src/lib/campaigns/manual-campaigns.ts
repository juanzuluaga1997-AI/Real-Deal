import type {
  CampaignInsight,
  CampaignStatus,
  CampaignType,
  DailyRecommendation,
  PersonInsight,
} from "@/lib/data/types";
import { getDailyRecommendations } from "@/lib/recommendations/daily-recommendations";
import { calculateSocialEquityScore } from "@/lib/scoring/social-equity-score";
import { daysUntil } from "@/lib/utils/dates";

export interface ManualCampaignInput {
  title: string;
  type: CampaignType;
  status: CampaignStatus;
  stage: string;
  objective: string;
  dueDate: string;
  targetPersonIds: string[];
  nextActionLabel: string;
  owner: string;
}

interface CampaignRelationshipStateInput {
  people: PersonInsight[];
  campaigns: CampaignInsight[];
  recommendations: DailyRecommendation[];
  referenceDate: string;
}

interface CampaignRelationshipState {
  people: PersonInsight[];
  campaigns: CampaignInsight[];
  recommendations: DailyRecommendation[];
}

function normalizeCampaignIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function createCampaignIdFromTitle(title: string): string {
  return normalizeCampaignIdentity(title) || `campaign-${Date.now()}`;
}

function getCampaignHealth(input: ManualCampaignInput): number {
  const targetCoverage = Math.min(18, input.targetPersonIds.length * 4);
  const daysUntilDue = daysUntil(input.dueDate, new Date());
  const duePressure = Number.isFinite(daysUntilDue) ? Math.max(0, Math.min(12, 12 - Math.max(0, daysUntilDue))) : 4;
  const statusScore = input.status === "active" ? 72 : input.status === "planning" ? 66 : input.status === "paused" ? 48 : 82;

  return Math.max(35, Math.min(92, Math.round(statusScore + targetCoverage + duePressure - 10)));
}

export function buildManualCampaign(input: ManualCampaignInput, people: PersonInsight[]): CampaignInsight {
  const id = createCampaignIdFromTitle(input.title);
  const targetPeople = input.targetPersonIds
    .map((personId) => people.find((person) => person.id === personId))
    .filter(Boolean) as PersonInsight[];

  return {
    id,
    title: input.title.trim(),
    type: input.type,
    status: input.status,
    stage: input.stage.trim() || "Manual campaign",
    objective:
      input.objective.trim() ||
      `Coordinate relationship motion for ${input.title.trim()} across the highest-signal contacts.`,
    targetPeopleIds: Array.from(new Set(input.targetPersonIds)),
    targetPeople,
    nextActions: [
      {
        id: `${id}-manual-next-action`,
        label: input.nextActionLabel.trim() || `Review the next relationship moves for ${input.title.trim()}.`,
        owner: input.owner,
        dueDate: input.dueDate,
        status: "open",
      },
    ],
    relevance: `Manual campaign created to coordinate ${targetPeople.length} target relationship${
      targetPeople.length === 1 ? "" : "s"
    } around a current company priority.`,
    dueDate: input.dueDate,
    health: getCampaignHealth(input),
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

function buildCampaignScoreExplanation(person: PersonInsight, topCampaign: CampaignInsight | undefined, scoreTotal: number): string {
  if (!topCampaign) {
    return person.scoreExplanation;
  }

  return `${person.name} has a Social Equity Score of ${scoreTotal}. The relationship is now tied to ${topCampaign.title}, so it should stay visible while that priority is active.`;
}

function buildCampaignNextAction(person: PersonInsight, topCampaign: CampaignInsight | undefined): string {
  if (!topCampaign) {
    return person.recommendedNextAction;
  }

  return `Send a focused note connected to ${topCampaign.title} and ask for one concrete next step.`;
}

export function buildCampaignRelationshipState({
  people,
  campaigns,
  recommendations,
  referenceDate,
}: CampaignRelationshipStateInput): CampaignRelationshipState {
  if (campaigns.length === 0 || people.length === 0) {
    return { people, campaigns, recommendations };
  }

  const campaignsByTargetPersonId = new Map<string, CampaignInsight[]>();

  campaigns.forEach((campaign) => {
    campaign.targetPeopleIds.forEach((personId) => {
      campaignsByTargetPersonId.set(personId, [...(campaignsByTargetPersonId.get(personId) ?? []), campaign]);
    });
  });

  const peopleWithCampaignAssignments = people.map((person) => {
    const targetedCampaigns = campaignsByTargetPersonId.get(person.id) ?? [];

    if (targetedCampaigns.length === 0) {
      return person;
    }

    const existingCampaignIds = new Set(person.campaignRelevance.map((relevance) => relevance.campaignId));
    const missingCampaigns = targetedCampaigns.filter((campaign) => !existingCampaignIds.has(campaign.id));

    if (missingCampaigns.length === 0) {
      return person;
    }

    const updatedPerson: PersonInsight = {
      ...person,
      campaignRelevance: [
        ...person.campaignRelevance,
        ...missingCampaigns.map((campaign) => ({
          campaignId: campaign.id,
          relevance: campaign.status === "active" ? 84 : 72,
          reason: `${person.name} was manually added to ${campaign.title}.`,
        })),
      ],
      tags: Array.from(new Set([...person.tags, ...missingCampaigns.map((campaign) => campaign.title)])),
    };
    const socialEquityScore = calculateSocialEquityScore(updatedPerson, campaigns, referenceDate);
    const topCampaign = targetedCampaigns[0];

    return {
      ...updatedPerson,
      socialEquityScore,
      scoreExplanation: buildCampaignScoreExplanation(updatedPerson, topCampaign, socialEquityScore.total),
      recommendedNextAction: buildCampaignNextAction(updatedPerson, topCampaign),
    };
  });
  const campaignsWithPeople = attachPeopleToCampaigns(campaigns, peopleWithCampaignAssignments);
  const updatedRecommendations = getDailyRecommendations(peopleWithCampaignAssignments, campaignsWithPeople, {
    referenceDate,
    limit: 5,
  });

  return {
    people: peopleWithCampaignAssignments,
    campaigns: campaignsWithPeople,
    recommendations: updatedRecommendations,
  };
}
