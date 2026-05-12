import type {
  Campaign,
  CampaignInsight,
  CampaignType,
  DailyRecommendation,
  Person,
  PersonInsight,
  RelationshipCategory,
} from "@/lib/data/types";
import type { ImportedContactRecord, ImportResult } from "@/lib/import/types";
import { getDailyRecommendations } from "@/lib/recommendations/daily-recommendations";
import { calculateSocialEquityScore } from "@/lib/scoring/social-equity-score";

interface ImportedRelationshipStateInput {
  basePeople: PersonInsight[];
  baseCampaigns: CampaignInsight[];
  baseRecommendations: DailyRecommendation[];
  importHistory: ImportResult[];
  referenceDate: string;
}

interface ImportedRelationshipState {
  people: PersonInsight[];
  campaigns: CampaignInsight[];
  recommendations: DailyRecommendation[];
  importedPeopleCount: number;
}

const validCategories = new Set<RelationshipCategory>([
  "Founder",
  "Investor",
  "Operator",
  "CEO",
  "Recruiter",
  "Advisor",
  "Candidate",
  "Partner",
  "Customer",
]);

function normalizeIdentity(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildImportedPersonId(contact: ImportedContactRecord): string {
  return `imported-${contact.id}`;
}

function getCategory(value: string): RelationshipCategory {
  return validCategories.has(value as RelationshipCategory) ? (value as RelationshipCategory) : "Founder";
}

function getCadenceDays(importanceLevel: number): number {
  if (importanceLevel >= 8) {
    return 21;
  }

  if (importanceLevel >= 6) {
    return 30;
  }

  return 45;
}

function getFallbackInteractionDate(contact: ImportedContactRecord, referenceDate: string): string {
  if (contact.lastInteractionDate) {
    return contact.lastInteractionDate;
  }

  return referenceDate;
}

function getMomentum(contact: ImportedContactRecord): Person["momentum"] {
  if (contact.decayRisk >= 70) {
    return "at-risk";
  }

  if (contact.decayRisk >= 40) {
    return "softening";
  }

  return "steady";
}

function getCampaignRelevance(contact: ImportedContactRecord): Person["campaignRelevance"] {
  return contact.campaignIds.map((campaignId, index) => ({
    campaignId,
    relevance: Math.max(55, Math.min(96, contact.importanceLevel * 8 + (contact.followUpCommitment ? 8 : 0) - index * 6)),
    reason: `${contact.name} was imported with explicit relevance to ${contact.campaignNames[index] ?? "an active company priority"}.`,
  }));
}

function getImportedInteraction(contact: ImportedContactRecord, referenceDate: string): Person["interactions"][number] {
  const interactionDate = getFallbackInteractionDate(contact, referenceDate);
  const summaryParts = [
    `Imported from ${contact.source}`,
    contact.relationshipType ? `as ${contact.relationshipType}` : undefined,
    contact.sourceSystem ? `via ${contact.sourceSystem}` : undefined,
  ].filter(Boolean);

  return {
    id: `${buildImportedPersonId(contact)}-import`,
    date: interactionDate,
    type: "intro",
    summary: summaryParts.join(" "),
    outcome:
      contact.status === "review"
        ? "The contact was parsed and needs a data quality review before high-confidence activation."
        : "The contact was parsed, deduplicated, classified, and added to the active relationship system.",
    nextStep:
      contact.followUpCommitment ??
      (contact.status === "review"
        ? "Review missing identity fields, then decide whether to activate the relationship."
        : "Confirm the next relationship touch and keep the imported context current."),
  };
}

function importedContactToPerson(contact: ImportedContactRecord, referenceDate: string): Person {
  const cadenceDays = getCadenceDays(contact.importanceLevel);
  const lastInteractionDate = getFallbackInteractionDate(contact, referenceDate);
  const followUpDueDate = contact.followUpCommitment ? referenceDate : undefined;

  return {
    id: buildImportedPersonId(contact),
    name: contact.name,
    role: contact.role ?? contact.relationshipType ?? "Relationship contact",
    company: contact.company ?? "Company not detected",
    email: contact.email,
    category: getCategory(contact.category),
    podId: contact.podId,
    ring: contact.ring,
    relationshipImportance: contact.importanceLevel,
    lastInteractionDate,
    cadenceDays,
    interactionFrequencyPerMonth: contact.followUpCommitment ? 1.1 : 0.5,
    responsiveness: contact.responsiveness ?? 0.62,
    historyStrength: contact.notes || contact.introHistory ? 7 : 4,
    momentum: getMomentum(contact),
    followUpDueDate,
    recentOpportunity: contact.introHistory,
    nextActionCommitment:
      contact.followUpCommitment ??
      (contact.status === "review"
        ? "Review the imported contact fields and confirm whether this relationship should be activated."
        : "Send a concise check-in tied to the imported context and confirm the next useful step."),
    campaignRelevance: getCampaignRelevance(contact),
    notes:
      [
        contact.notes,
        contact.introHistory ? `Intro history: ${contact.introHistory}` : undefined,
        contact.email ? `Email: ${contact.email}` : undefined,
        contact.phone ? `Phone: ${contact.phone}` : undefined,
        contact.validationIssues.length > 0 ? `Review issues: ${contact.validationIssues.join(", ")}` : undefined,
      ]
        .filter(Boolean)
        .join(" | ") || "Imported relationship record with limited context.",
    tags: Array.from(
      new Set([
        ...contact.tags,
        contact.podName,
        contact.status === "review" ? "Needs review" : "Imported",
        ...contact.campaignNames.slice(0, 2),
      ]),
    ),
    interactions: [getImportedInteraction(contact, referenceDate)],
  };
}

function dedupeImportedContacts(importHistory: ImportResult[]): ImportedContactRecord[] {
  const contactMap = new Map<string, ImportedContactRecord>();

  importHistory.forEach((result) => {
    result.contacts.forEach((contact) => {
      const normalizedName = normalizeIdentity(contact.name);
      const normalizedCompany = normalizeIdentity(contact.company);
      const fallbackIdentityKey = normalizedName || normalizedCompany ? `${normalizedName}:${normalizedCompany}` : contact.id;
      const identityKey = contact.email?.trim().toLowerCase() || fallbackIdentityKey;
      const existing = contactMap.get(identityKey);

      if (!existing || contact.initialSocialEquityScore >= existing.initialSocialEquityScore) {
        contactMap.set(identityKey, contact);
      }
    });
  });

  return Array.from(contactMap.values());
}

function getCampaignType(campaignName: string): CampaignType {
  const normalizedName = campaignName.toLowerCase();

  if (normalizedName.includes("series") || normalizedName.includes("fund") || normalizedName.includes("investor")) {
    return "fundraising";
  }

  if (normalizedName.includes("hire") || normalizedName.includes("recruit") || normalizedName.includes("search")) {
    return "hiring";
  }

  if (normalizedName.includes("event") || normalizedName.includes("dinner")) {
    return "event";
  }

  if (normalizedName.includes("partner") || normalizedName.includes("channel") || normalizedName.includes("alliance")) {
    return "partnership";
  }

  return "customer-intros";
}

function getImportedCampaigns(people: Person[], referenceDate: string): Campaign[] {
  const campaignMap = new Map<string, Campaign>();

  people.forEach((person) => {
    person.campaignRelevance.forEach((relevance) => {
      if (campaignMap.has(relevance.campaignId)) {
        campaignMap.get(relevance.campaignId)?.targetPeopleIds.push(person.id);
        return;
      }

      const campaignName = relevance.reason.match(/to (.+)\.$/)?.[1] ?? "Imported Relationship Priority";

      campaignMap.set(relevance.campaignId, {
        id: relevance.campaignId,
        title: campaignName,
        type: getCampaignType(campaignName),
        status: "active",
        stage: "Imported relationship review",
        objective: `Turn imported relationship context for ${campaignName} into prioritized founder actions.`,
        targetPeopleIds: [person.id],
        nextActions: [
          {
            id: `${relevance.campaignId}-review-imports`,
            label: `Review imported relationships tied to ${campaignName}`,
            owner: "Avery Hart",
            dueDate: referenceDate,
            status: "open",
          },
        ],
        relevance: "Imported contacts were connected to this strategic priority during upload classification.",
        dueDate: referenceDate,
        health: 64,
      });
    });
  });

  return Array.from(campaignMap.values());
}

function mergeCampaigns(baseCampaigns: CampaignInsight[], importedPeople: Person[], referenceDate: string): Campaign[] {
  const campaignMap = new Map<string, Campaign>(
    baseCampaigns.map((campaign) => [
      campaign.id,
      {
        ...campaign,
        targetPeopleIds: [...campaign.targetPeopleIds],
        nextActions: [...campaign.nextActions],
      },
    ]),
  );

  getImportedCampaigns(importedPeople, referenceDate).forEach((importedCampaign) => {
    const existingCampaign = campaignMap.get(importedCampaign.id);

    if (!existingCampaign) {
      campaignMap.set(importedCampaign.id, importedCampaign);
      return;
    }

    campaignMap.set(importedCampaign.id, {
      ...existingCampaign,
      targetPeopleIds: Array.from(new Set([...existingCampaign.targetPeopleIds, ...importedCampaign.targetPeopleIds])),
    });
  });

  return Array.from(campaignMap.values());
}

function createInsights(people: Person[], campaigns: Campaign[], referenceDate: string): PersonInsight[] {
  return people.map((person) => {
    const socialEquityScore = calculateSocialEquityScore(person, campaigns, referenceDate);
    const relatedCampaigns = campaigns.filter((campaign) =>
      person.campaignRelevance.some((relevance) => relevance.campaignId === campaign.id),
    );
    const topCampaign = relatedCampaigns[0];
    const scoreBand = socialEquityScore.total >= 82 ? "excellent" : socialEquityScore.total >= 68 ? "healthy" : "watch";
    const riskText =
      socialEquityScore.daysOverdue > 0
        ? `The relationship is ${socialEquityScore.daysOverdue} days past its expected touch point.`
        : "The relationship is inside the expected touch window.";

    return {
      ...person,
      socialEquityScore,
      scoreExplanation: `${person.name} has ${scoreBand === "excellent" ? "an" : "a"} ${scoreBand} Social Equity Score of ${
        socialEquityScore.total
      }. The strongest signal is ${
        topCampaign ? `relevance to ${topCampaign.title}` : "relationship importance"
      }. ${riskText}`,
      historySummary: person.interactions[0]
        ? `${person.name}'s latest relationship context: ${person.interactions[0].summary}. ${person.interactions[0].outcome}`
        : `${person.name} has no logged interaction history yet.`,
      recommendedNextAction:
        person.nextActionCommitment ??
        (topCampaign
          ? `Send a focused note connected to ${topCampaign.title} and ask for one concrete next step.`
          : "Send a short check-in with one useful update and one clear ask."),
    };
  });
}

function attachPeopleToCampaigns(campaigns: Campaign[], people: PersonInsight[]): CampaignInsight[] {
  return campaigns.map((campaign) => ({
    ...campaign,
    targetPeople: campaign.targetPeopleIds
      .map((personId) => people.find((person) => person.id === personId))
      .filter(Boolean) as PersonInsight[],
  }));
}

export function buildImportedRelationshipState({
  basePeople,
  baseCampaigns,
  baseRecommendations,
  importHistory,
  referenceDate,
}: ImportedRelationshipStateInput): ImportedRelationshipState {
  const importedContacts = dedupeImportedContacts(importHistory);

  if (importedContacts.length === 0) {
    return {
      people: basePeople,
      campaigns: baseCampaigns,
      recommendations: baseRecommendations,
      importedPeopleCount: 0,
    };
  }

  const existingPersonIds = new Set(basePeople.map((person) => person.id));
  const importedPeople = importedContacts
    .map((contact) => importedContactToPerson(contact, referenceDate))
    .filter((person) => !existingPersonIds.has(person.id));
  const campaigns = mergeCampaigns(baseCampaigns, importedPeople, referenceDate);
  const people = [...basePeople, ...createInsights(importedPeople, campaigns, referenceDate)];
  const campaignInsights = attachPeopleToCampaigns(campaigns, people);
  const recommendations = getDailyRecommendations([...basePeople, ...importedPeople], campaigns, { referenceDate, limit: 5 });

  return {
    people,
    campaigns: campaignInsights,
    recommendations,
    importedPeopleCount: importedPeople.length,
  };
}
