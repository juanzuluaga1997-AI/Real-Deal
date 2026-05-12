import type { GmailIntegrationStatus } from "@/lib/email/types";
import { hasStoredGmailRefreshToken, readStoredGmailRefreshToken } from "@/server/integrations/gmail/gmail-token-store";

export const gmailReadonlyScope = "https://www.googleapis.com/auth/gmail.readonly";

const requiredEnvironmentFields = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"] as const;

function hasEnvironmentValue(field: string): boolean {
  return Boolean(process.env[field]?.trim());
}

export function getGmailOAuthClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET before connecting Gmail.");
  }

  return { clientId, clientSecret };
}

export function getConfiguredGmailRefreshToken(): string {
  const environmentRefreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
  const storedRefreshToken = readStoredGmailRefreshToken();
  const refreshToken = environmentRefreshToken || storedRefreshToken;

  if (!refreshToken) {
    throw new Error("Connect Gmail or add GMAIL_REFRESH_TOKEN before running a real Gmail sync.");
  }

  return refreshToken;
}

export function getGmailIntegrationStatus(): GmailIntegrationStatus {
  const missingFields: string[] = requiredEnvironmentFields.filter((field) => !hasEnvironmentValue(field));
  const hasEnvironmentRefreshToken = hasEnvironmentValue("GMAIL_REFRESH_TOKEN");
  const hasLocalRefreshToken = hasStoredGmailRefreshToken();
  const hasRefreshToken = hasEnvironmentRefreshToken || hasLocalRefreshToken;
  const canConnect = missingFields.length === 0;

  if (!hasRefreshToken) {
    missingFields.push("GMAIL_REFRESH_TOKEN or local OAuth token");
  }

  const configured = canConnect && hasRefreshToken;

  return {
    provider: "gmail",
    configured,
    mode: configured ? "gmail" : "mock",
    missingFields,
    scopes: [gmailReadonlyScope],
    accountAddressStoredInCode: false,
    canConnect,
    connectUrl: "/api/integrations/gmail/connect",
    tokenSource: hasEnvironmentRefreshToken ? "environment" : hasLocalRefreshToken ? "local-oauth" : "none",
    tokenStorage: hasEnvironmentRefreshToken ? "environment" : hasLocalRefreshToken ? "local-private-file" : "none",
  };
}

export function getGmailSyncDefaults() {
  return {
    lookbackDays: Number(process.env.GMAIL_SYNC_LOOKBACK_DAYS ?? 365),
    maxMessagesPerContact: Number(process.env.GMAIL_SYNC_MAX_MESSAGES_PER_CONTACT ?? 0),
  };
}
