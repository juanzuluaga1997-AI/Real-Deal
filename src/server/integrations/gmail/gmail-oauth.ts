import { randomBytes } from "node:crypto";

import { gmailReadonlyScope, getGmailOAuthClientCredentials } from "@/server/integrations/gmail/gmail-config";
import { saveStoredGmailOAuthToken } from "@/server/integrations/gmail/gmail-token-store";

export const gmailOAuthStateCookieName = "real_deal_gmail_oauth_state";

interface GmailOAuthTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export function createGmailOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function getGmailOAuthRedirectUri(origin: string): string {
  return new URL("/api/integrations/gmail/callback", origin).toString();
}

export function buildGmailAuthorizationUrl(origin: string, state: string): string {
  const { clientId } = getGmailOAuthClientCredentials();
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", getGmailOAuthRedirectUri(origin));
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", gmailReadonlyScope);
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("prompt", "consent");
  authorizationUrl.searchParams.set("include_granted_scopes", "true");
  authorizationUrl.searchParams.set("state", state);

  return authorizationUrl.toString();
}

export async function exchangeGmailAuthorizationCode(origin: string, code: string) {
  const { clientId, clientSecret } = getGmailOAuthClientCredentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: getGmailOAuthRedirectUri(origin),
    }),
  });
  const payload = (await response.json()) as GmailOAuthTokenResponse;

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Google OAuth authorization failed.");
  }

  if (!payload.refresh_token) {
    throw new Error("Google did not return a refresh token. Reconnect Gmail and approve offline read-only access.");
  }

  return saveStoredGmailOAuthToken({
    refreshToken: payload.refresh_token,
    scope: payload.scope,
    tokenType: payload.token_type,
  });
}
