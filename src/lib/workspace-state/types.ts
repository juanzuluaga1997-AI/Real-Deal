import type { CampaignInsight } from "@/lib/data/types";
import type { EmailSyncResult } from "@/lib/email/types";
import type { ImportResult } from "@/lib/import/types";

export interface SavedDashboardSnapshot {
  id: string;
  savedAt: string;
  generatedAt: string;
  selectedPersonName: string;
  selectedPersonCompany: string;
  selectedCampaignTitle: string;
  selectedPodName: string;
  plannedTouchCount: number;
  recommendationCount: number;
  averageScore: number;
  atRiskCount: number;
  people: Array<{
    id: string;
    name: string;
    company: string;
    score: number;
    decayRisk: number;
  }>;
}

export interface WorkspaceState {
  savedDashboards: SavedDashboardSnapshot[];
  importHistory: ImportResult[];
  emailSyncResult: EmailSyncResult | null;
  manualCampaigns: CampaignInsight[];
  deletedCampaignIds: string[];
}

export interface WorkspaceStatePayload extends WorkspaceState {
  updatedAt: string;
}

export const emptyWorkspaceState: WorkspaceState = {
  savedDashboards: [],
  importHistory: [],
  emailSyncResult: null,
  manualCampaigns: [],
  deletedCampaignIds: [],
};

