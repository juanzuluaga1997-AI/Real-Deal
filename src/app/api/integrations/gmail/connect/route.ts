import { NextRequest, NextResponse } from "next/server";

import {
  buildGmailAuthorizationUrl,
  createGmailOAuthState,
  gmailOAuthStateCookieName,
} from "@/server/integrations/gmail/gmail-oauth";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  try {
    const state = createGmailOAuthState();
    const authorizationUrl = buildGmailAuthorizationUrl(request.nextUrl.origin, state);
    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set(gmailOAuthStateCookieName, state, {
      httpOnly: true,
      maxAge: 10 * 60,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Gmail authorization.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
