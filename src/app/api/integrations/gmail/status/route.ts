import { NextResponse } from "next/server";

import { getGmailIntegrationStatus } from "@/server/integrations/gmail/gmail-config";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ status: getGmailIntegrationStatus() });
}
