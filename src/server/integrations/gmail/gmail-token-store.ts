import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredGmailOAuthToken {
  refreshToken: string;
  scope?: string;
  tokenType?: string;
  savedAt: string;
}

function getDefaultTokenPath(): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "config", "private", "gmail-oauth-token.json");
}

export function getGmailTokenFilePath(): string {
  return getDefaultTokenPath();
}

function hasUsableRefreshToken(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function readStoredGmailOAuthToken(): StoredGmailOAuthToken | null {
  const tokenPath = getGmailTokenFilePath();

  try {
    if (!fs.existsSync(tokenPath)) {
      return null;
    }

    const payload = JSON.parse(fs.readFileSync(tokenPath, "utf-8")) as Partial<StoredGmailOAuthToken>;

    if (!hasUsableRefreshToken(payload.refreshToken)) {
      return null;
    }

    return {
      refreshToken: payload.refreshToken.trim(),
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
      tokenType: typeof payload.tokenType === "string" ? payload.tokenType : undefined,
      savedAt: typeof payload.savedAt === "string" ? payload.savedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function readStoredGmailRefreshToken(): string | undefined {
  return readStoredGmailOAuthToken()?.refreshToken;
}

export function hasStoredGmailRefreshToken(): boolean {
  return Boolean(readStoredGmailRefreshToken());
}

export async function saveStoredGmailOAuthToken(input: {
  refreshToken: string;
  scope?: string;
  tokenType?: string;
}): Promise<StoredGmailOAuthToken> {
  const tokenPath = getGmailTokenFilePath();
  const token: StoredGmailOAuthToken = {
    refreshToken: input.refreshToken.trim(),
    scope: input.scope,
    tokenType: input.tokenType,
    savedAt: new Date().toISOString(),
  };

  if (!hasUsableRefreshToken(token.refreshToken)) {
    throw new Error("Google did not return a usable Gmail refresh token.");
  }

  await mkdir(path.dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, `${JSON.stringify(token, null, 2)}\n`, { encoding: "utf-8", mode: 0o600 });

  return token;
}
