import type { ContactEmailEvent, ContactEmailSyncTarget } from "@/lib/email/types";
import { getConfiguredGmailRefreshToken, getGmailOAuthClientCredentials } from "@/server/integrations/gmail/gmail-config";

interface GmailMessageListItem {
  id: string;
  threadId?: string;
}

interface GmailMessageListResponse {
  messages?: GmailMessageListItem[];
  nextPageToken?: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
  };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getHeader(message: GmailMessage, headerName: string): string {
  return message.payload?.headers?.find((header) => header.name.toLowerCase() === headerName.toLowerCase())?.value ?? "";
}

function parseMessageDate(message: GmailMessage): string {
  const rawDate = getHeader(message, "Date");
  const parsedDate = new Date(rawDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString();
  }

  return parsedDate.toISOString();
}

function getMessageDirection(message: GmailMessage): "sent" | "received" {
  return message.labelIds?.includes("SENT") ? "sent" : "received";
}

function buildSearchQuery(contact: ContactEmailSyncTarget, lookbackDays: number): string {
  const lookback = lookbackDays > 0 ? `newer_than:${Math.max(1, lookbackDays)}d` : "";

  if (contact.email) {
    return `${lookback} {from:${contact.email} to:${contact.email}}`.trim();
  }

  return `${lookback} "${contact.name}"`.trim();
}

async function getGmailAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getGmailOAuthClientCredentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: getConfiguredGmailRefreshToken(),
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Gmail authorization failed. Refresh the OAuth token or reconnect the mailbox.");
  }

  const payload = (await response.json()) as { access_token?: string };

  if (!payload.access_token) {
    throw new Error("Gmail authorization did not return an access token.");
  }

  return payload.access_token;
}

async function gmailFetch<T>(accessToken: string, path: string, searchParams?: URLSearchParams): Promise<T> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`);

  if (searchParams) {
    searchParams.forEach((value, key) => url.searchParams.set(key, value));
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Gmail could not be read. Confirm the mailbox is connected with read-only access.");
  }

  return (await response.json()) as T;
}

function getMetadataSearchParams(headers: string[]): URLSearchParams {
  const searchParams = new URLSearchParams({ format: "metadata" });
  headers.forEach((header) => searchParams.append("metadataHeaders", header));
  return searchParams;
}

function messageToEmailEvent(message: GmailMessage, contact: ContactEmailSyncTarget): ContactEmailEvent {
  const subject = normalizeWhitespace(getHeader(message, "Subject")) || "No subject";
  const snippet = normalizeWhitespace(message.snippet ?? "");

  return {
    id: `gmail-${contact.personId}-${message.id}`,
    personId: contact.personId,
    messageId: message.id,
    threadId: message.threadId,
    contactEmail: contact.email,
    date: parseMessageDate(message),
    direction: getMessageDirection(message),
    subject,
    snippet,
  };
}

export async function fetchGmailEmailEventsForContacts(
  contacts: ContactEmailSyncTarget[],
  options: { lookbackDays: number; maxMessagesPerContact: number },
): Promise<ContactEmailEvent[]> {
  const accessToken = await getGmailAccessToken();
  const events: ContactEmailEvent[] = [];
  const unlimitedMessages = options.maxMessagesPerContact <= 0;

  for (const contact of contacts) {
    const query = buildSearchQuery(contact, options.lookbackDays);
    let pageToken: string | undefined;
    let importedForContact = 0;

    do {
      const remainingMessages = unlimitedMessages ? 500 : Math.max(0, options.maxMessagesPerContact - importedForContact);
      const searchParams = new URLSearchParams({
        q: query,
        maxResults: String(Math.max(1, Math.min(500, remainingMessages))),
      });

      if (pageToken) {
        searchParams.set("pageToken", pageToken);
      }

      const listResponse = await gmailFetch<GmailMessageListResponse>(accessToken, "messages", searchParams);

      for (const message of listResponse.messages ?? []) {
        const detail = await gmailFetch<GmailMessage>(
          accessToken,
          `messages/${message.id}`,
          getMetadataSearchParams(["From", "To", "Subject", "Date"]),
        );
        events.push(messageToEmailEvent(detail, contact));
        importedForContact += 1;
      }

      pageToken = listResponse.nextPageToken;
    } while (pageToken && (unlimitedMessages || importedForContact < options.maxMessagesPerContact));
  }

  return events.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}
