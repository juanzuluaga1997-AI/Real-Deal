import type { RelationshipRing } from "@/lib/data/types";

export type ImportSourceType =
  | "excel"
  | "csv"
  | "word"
  | "powerpoint"
  | "pdf"
  | "text"
  | "json"
  | "manual"
  | "google-sheets"
  | "google-docs"
  | "google-slides"
  | "unknown";

export type ImportedContactStatus = "ready" | "review";

export interface ImportedContactReviewIssue {
  rowNumber: number;
  issue: string;
}

export interface ImportedPodAssignment {
  podId: string;
  podName: string;
  count: number;
}

export interface ImportSummary {
  totalRowsProcessed: number;
  contactsImported: number;
  duplicatesMerged: number;
  rowsNeedingReview: number;
  campaignsDetected: string[];
  podsAssigned: ImportedPodAssignment[];
  reviewIssues: ImportedContactReviewIssue[];
}

export interface ImportedContactRecord {
  id: string;
  rowNumbers: number[];
  name: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  relationshipType?: string;
  lastInteractionDate?: string;
  notes?: string;
  tags: string[];
  campaignNames: string[];
  campaignIds: string[];
  importanceLevel: number;
  source: string;
  sourceSystem?: string;
  introHistory?: string;
  responsiveness?: number;
  followUpCommitment?: string;
  podId: string;
  podName: string;
  category: string;
  ring: RelationshipRing;
  initialSocialEquityScore: number;
  decayRisk: number;
  status: ImportedContactStatus;
  validationIssues: string[];
  mergedFrom: number;
}

export interface ImportResult {
  sourceName: string;
  sourceType: ImportSourceType;
  parsedAt: string;
  recordCount: number;
  contacts: ImportedContactRecord[];
  summary: ImportSummary;
  extractedTextPreview: string;
  warnings: string[];
}
