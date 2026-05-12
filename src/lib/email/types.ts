export type EmailSyncMode = "gmail" | "mock";
export type EmailDirection = "sent" | "received";

export interface ContactEmailSyncTarget {
  personId: string;
  name: string;
  company?: string;
  email?: string;
  lastInteractionDate?: string;
}

export interface ContactEmailEvent {
  id: string;
  personId: string;
  messageId: string;
  threadId?: string;
  contactEmail?: string;
  date: string;
  direction: EmailDirection;
  subject: string;
  snippet: string;
}

export interface EmailSyncSummary {
  provider: "gmail";
  mode: EmailSyncMode;
  configured: boolean;
  scannedContacts: number;
  matchedContacts: number;
  messagesImported: number;
  latestEmailDate?: string;
  warnings: string[];
}

export interface EmailSyncResult {
  sourceName: "Gmail";
  syncedAt: string;
  summary: EmailSyncSummary;
  events: ContactEmailEvent[];
}

export interface GmailIntegrationStatus {
  provider: "gmail";
  configured: boolean;
  mode: EmailSyncMode;
  missingFields: string[];
  scopes: string[];
  accountAddressStoredInCode: false;
  canConnect: boolean;
  connectUrl: string;
  tokenSource: "environment" | "local-oauth" | "none";
  tokenStorage: "environment" | "local-private-file" | "none";
}
