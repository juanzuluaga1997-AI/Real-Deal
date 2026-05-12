import type { ContactEmailEvent, ContactEmailSyncTarget, EmailSyncResult } from "@/lib/email/types";
import { getGmailIntegrationStatus, getGmailSyncDefaults } from "@/server/integrations/gmail/gmail-config";
import { fetchGmailEmailEventsForContacts } from "@/server/integrations/gmail/gmail-client";

interface GmailSyncOptions {
  lookbackDays?: number;
  maxMessagesPerContact?: number;
}

function normalizeEmail(value?: string): string | undefined {
  return value?.trim().toLowerCase() || undefined;
}

function normalizeContact(contact: ContactEmailSyncTarget): ContactEmailSyncTarget {
  return {
    ...contact,
    name: contact.name.trim(),
    company: contact.company?.trim() || undefined,
    email: normalizeEmail(contact.email),
  };
}

function createMockEmailEvents(contacts: ContactEmailSyncTarget[], maxMessagesPerContact: number): ContactEmailEvent[] {
  return contacts.slice(0, 8).flatMap((contact, contactIndex) => {
    const effectiveLimit = maxMessagesPerContact <= 0 ? 3 : maxMessagesPerContact;
    const messageCount = Math.min(effectiveLimit, contactIndex % 2 === 0 ? 2 : 1);

    return Array.from({ length: messageCount }, (_, messageIndex) => {
      const day = 10 - ((contactIndex + messageIndex) % 7);
      const direction = messageIndex % 2 === 0 ? "received" : "sent";
      const subject =
        direction === "received"
          ? `Re: ${contact.company ?? contact.name} relationship follow-up`
          : `Follow-up for ${contact.company ?? contact.name}`;

      return {
        id: `gmail-mock-${contact.personId}-${messageIndex}`,
        personId: contact.personId,
        messageId: `mock-${contact.personId}-${messageIndex}`,
        contactEmail: contact.email,
        date: `2026-05-${String(day).padStart(2, "0")}T15:00:00.000Z`,
        direction,
        subject,
        snippet:
          direction === "received"
            ? `${contact.name} replied with relationship context that should inform the next founder touch.`
            : `A concise founder follow-up was sent to ${contact.name} with one clear next step.`,
      } satisfies ContactEmailEvent;
    });
  });
}

function buildSyncResult(input: {
  configured: boolean;
  mode: "gmail" | "mock";
  contacts: ContactEmailSyncTarget[];
  events: ContactEmailEvent[];
  warnings: string[];
}): EmailSyncResult {
  const matchedContacts = new Set(input.events.map((event) => event.personId)).size;
  const latestEmailDate = input.events[0]?.date;

  return {
    sourceName: "Gmail",
    syncedAt: new Date().toISOString(),
    summary: {
      provider: "gmail",
      mode: input.mode,
      configured: input.configured,
      scannedContacts: input.contacts.length,
      matchedContacts,
      messagesImported: input.events.length,
      latestEmailDate,
      warnings: input.warnings,
    },
    events: input.events,
  };
}

export async function syncGmailRelationshipHistory(
  contacts: ContactEmailSyncTarget[],
  options: GmailSyncOptions = {},
): Promise<EmailSyncResult> {
  const defaults = getGmailSyncDefaults();
  const normalizedContacts = contacts.map(normalizeContact).filter((contact) => contact.personId && contact.name);
  const lookbackDays = options.lookbackDays ?? defaults.lookbackDays;
  const maxMessagesPerContact = options.maxMessagesPerContact ?? defaults.maxMessagesPerContact;
  const status = getGmailIntegrationStatus();

  if (!status.configured) {
    const events = createMockEmailEvents(normalizedContacts, maxMessagesPerContact);

    return buildSyncResult({
      configured: false,
      mode: "mock",
      contacts: normalizedContacts,
      events,
      warnings: ["Gmail OAuth credentials are not configured. Deterministic demo email history was used."],
    });
  }

  const events = await fetchGmailEmailEventsForContacts(normalizedContacts, { lookbackDays, maxMessagesPerContact });

  return buildSyncResult({
    configured: true,
    mode: "gmail",
    contacts: normalizedContacts,
    events,
    warnings: [],
  });
}
