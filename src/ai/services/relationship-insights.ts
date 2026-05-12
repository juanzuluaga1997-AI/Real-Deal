import { getAiClient } from "@/ai/clients";
import { promptTemplates } from "@/ai/prompts/templates";
import type { Campaign, Person, SocialEquityScore } from "@/lib/data/types";
import { getScoreBand } from "@/lib/scoring/social-equity-score";

function getStrongestScoreFactor(score: SocialEquityScore): string {
  const entries = Object.entries(score.components).sort((left, right) => right[1] - left[1]);
  return entries[0]?.[0] ?? "relationship context";
}

function getWeakestScoreFactor(score: SocialEquityScore): string {
  const entries = Object.entries(score.components).sort((left, right) => left[1] - right[1]);
  return entries[0]?.[0] ?? "cadence";
}

function humanizeFactor(factor: string): string {
  return factor.replace(/([A-Z])/g, " $1").toLowerCase();
}

export async function explainSocialEquityScore(person: Person, score: SocialEquityScore): Promise<string> {
  const band = getScoreBand(score.total);
  const strongestFactor = humanizeFactor(getStrongestScoreFactor(score));
  const weakestFactor = humanizeFactor(getWeakestScoreFactor(score));
  const riskLanguage =
    score.daysOverdue > 0
      ? `The main risk is cadence: the relationship is ${score.daysOverdue} days past its expected touch point.`
      : "The current cadence is inside the expected touch window.";
  const scoreArticle = band === "excellent" ? "an" : "a";
  const fallbackText = `${person.name} has ${scoreArticle} ${band} Social Equity Score of ${score.total}. The score is supported by ${strongestFactor}, while ${weakestFactor} is the area to watch. ${riskLanguage}`;

  const response = await getAiClient().generateText({
    task: "score-explanation",
    prompt: promptTemplates.scoreExplanation.template,
    context: { personId: person.id, score },
    fallbackText,
  });

  return response.text;
}

export async function summarizeRelationshipHistory(person: Person): Promise<string> {
  const latestInteraction = person.interactions[0];
  const fallbackText = latestInteraction
    ? `${person.name}'s recent history centers on ${latestInteraction.summary.toLowerCase()} The last clear outcome was: ${latestInteraction.outcome}`
    : `${person.name} has no logged interaction history yet.`;

  const response = await getAiClient().generateText({
    task: "relationship-history-summary",
    prompt: promptTemplates.relationshipHistorySummary.template,
    context: { personId: person.id, interactions: person.interactions },
    fallbackText,
  });

  return response.text;
}

export async function suggestNextAction(person: Person, relatedCampaigns: Campaign[]): Promise<string> {
  const topCampaign = [...person.campaignRelevance]
    .sort((left, right) => right.relevance - left.relevance)
    .map((relevance) => relatedCampaigns.find((campaign) => campaign.id === relevance.campaignId))
    .find(Boolean);
  const fallbackText =
    person.nextActionCommitment ??
    (topCampaign
      ? `Send a concise note tied to ${topCampaign.title} and ask for one specific next step.`
      : "Send a brief relationship-centered check-in with one useful update and one clear ask.");

  const response = await getAiClient().generateText({
    task: "suggested-next-actions",
    prompt: promptTemplates.suggestedNextActions.template,
    context: { personId: person.id, campaignIds: relatedCampaigns.map((campaign) => campaign.id) },
    fallbackText,
  });

  return response.text;
}
