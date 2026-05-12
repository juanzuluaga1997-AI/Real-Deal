export type CampaignType =
  | "fundraising"
  | "hiring"
  | "event"
  | "partnership"
  | "customer-intros";

export type CampaignStatus = "active" | "planning" | "paused" | "complete";

export type RelationshipCategory =
  | "Founder"
  | "Investor"
  | "Operator"
  | "CEO"
  | "Recruiter"
  | "Advisor"
  | "Candidate"
  | "Partner"
  | "Customer";

export type RelationshipRing = "inner" | "core" | "network";

export type RelationshipMomentum = "gaining" | "steady" | "softening" | "at-risk";

export type InteractionType =
  | "email"
  | "call"
  | "meeting"
  | "intro"
  | "event"
  | "message";

export type RecommendationUrgency = "critical" | "high" | "medium" | "low";

export interface FounderProfile {
  id: string;
  name: string;
  role: string;
  company: string;
  operatingFocus: string;
}

export interface RelationshipPod {
  id: string;
  name: string;
  focus: string;
  description: string;
  color: string;
}

export interface Interaction {
  id: string;
  date: string;
  type: InteractionType;
  summary: string;
  outcome: string;
  nextStep?: string;
  source?: "manual" | "import" | "gmail";
  emailDirection?: "sent" | "received";
  emailSubject?: string;
}

export interface CampaignRelevance {
  campaignId: string;
  relevance: number;
  reason: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  company: string;
  email?: string;
  category: RelationshipCategory;
  podId: string;
  ring: RelationshipRing;
  relationshipImportance: number;
  lastInteractionDate: string;
  cadenceDays: number;
  interactionFrequencyPerMonth: number;
  responsiveness: number;
  historyStrength: number;
  momentum: RelationshipMomentum;
  campaignRelevance: CampaignRelevance[];
  followUpDueDate?: string;
  recentOpportunity?: string;
  nextActionCommitment?: string;
  notes: string;
  tags: string[];
  interactions: Interaction[];
}

export interface CampaignAction {
  id: string;
  label: string;
  owner: string;
  dueDate: string;
  status: "open" | "planned" | "done";
}

export interface Campaign {
  id: string;
  title: string;
  type: CampaignType;
  status: CampaignStatus;
  stage: string;
  objective: string;
  targetPeopleIds: string[];
  nextActions: CampaignAction[];
  relevance: string;
  dueDate: string;
  health: number;
}

export interface ScoreComponents {
  relationshipImportance: number;
  recency: number;
  interactionFrequency: number;
  responsiveness: number;
  campaignRelevance: number;
  historyStrength: number;
  decayResistance: number;
}

export interface SocialEquityScore {
  total: number;
  components: ScoreComponents;
  daysSinceLastInteraction: number;
  daysOverdue: number;
  decayRisk: number;
  cadenceDays: number;
}

export interface PersonInsight extends Person {
  socialEquityScore: SocialEquityScore;
  scoreExplanation: string;
  historySummary: string;
  recommendedNextAction: string;
}

export interface DailyRecommendation {
  personId: string;
  urgency: RecommendationUrgency;
  score: number;
  reason: string;
  suggestedAction: string;
  relatedCampaignId?: string;
  drivers: string[];
}

export interface CampaignInsight extends Campaign {
  targetPeople: PersonInsight[];
}
