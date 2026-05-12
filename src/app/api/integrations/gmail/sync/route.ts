import { NextResponse } from "next/server";

import type { ContactEmailSyncTarget } from "@/lib/email/types";
import { syncGmailRelationshipHistory } from "@/server/integrations/gmail/gmail-sync-service";

export const runtime = "nodejs";

interface GmailSyncRequestBody {
  contacts?: ContactEmailSyncTarget[];
  lookbackDays?: number;
  maxMessagesPerContact?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GmailSyncRequestBody;
    const contacts = Array.isArray(body.contacts) ? body.contacts : [];

    if (contacts.length === 0) {
      return NextResponse.json({ error: "Send at least one contact to sync with Gmail." }, { status: 400 });
    }

    const result = await syncGmailRelationshipHistory(contacts, {
      lookbackDays: body.lookbackDays,
      maxMessagesPerContact: body.maxMessagesPerContact,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sync Gmail relationship history.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
