import type { CampaignInsight, DailyRecommendation, FounderProfile, PersonInsight } from "@/lib/data/types";

export interface ReportHealthOverview {
  averageScore: number;
  innerCircleCount: number;
  atRiskCount: number;
  activeCampaignCount: number;
  trackedPeopleCount: number;
}

export interface ReportRecommendation extends DailyRecommendation {
  personName: string;
  personRole: string;
  personCompany: string;
  relationshipScore: number;
  relatedCampaignTitle?: string;
}

export interface DashboardReport {
  title: string;
  generatedAt: string;
  founder: FounderProfile;
  health: ReportHealthOverview;
  recommendations: ReportRecommendation[];
  activeCampaigns: CampaignInsight[];
  priorityRelationships: PersonInsight[];
}
