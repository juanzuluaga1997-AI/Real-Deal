import { NextRequest, NextResponse } from "next/server";

import { exchangeGmailAuthorizationCode, gmailOAuthStateCookieName } from "@/server/integrations/gmail/gmail-oauth";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderOAuthResultPage(input: { title: string; message: string; isSuccess: boolean }): NextResponse {
  const accent = input.isSuccess ? "#6ee7b7" : "#fb7185";
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #11100d;
        color: #f8f6f0;
        font-family: Arial, sans-serif;
      }
      main {
        width: min(520px, calc(100vw - 32px));
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        background: #1d1b17;
        padding: 28px;
      }
      h1 {
        margin: 0;
        color: ${accent};
        font-size: 24px;
      }
      p {
        color: #c9c1ad;
        line-height: 1.6;
      }
      a {
        display: inline-flex;
        margin-top: 12px;
        border-radius: 6px;
        background: ${accent};
        color: #11100d;
        padding: 10px 14px;
        font-weight: 700;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="/">Return to Real Deal</a>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export async function GET(request: NextRequest) {
  const googleError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(gmailOAuthStateCookieName)?.value;

  if (googleError) {
    const response = renderOAuthResultPage({
      title: "Gmail was not connected",
      message: `Google returned this authorization error: ${googleError}.`,
      isSuccess: false,
    });
    response.cookies.delete(gmailOAuthStateCookieName);
    return response;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = renderOAuthResultPage({
      title: "Gmail was not connected",
      message: "The authorization session expired or did not match. Start the Gmail connection again from Real Deal.",
      isSuccess: false,
    });
    response.cookies.delete(gmailOAuthStateCookieName);
    return response;
  }

  try {
    await exchangeGmailAuthorizationCode(request.nextUrl.origin, code);
    const response = renderOAuthResultPage({
      title: "Gmail connected",
      message: "Real Deal now has read-only Gmail access. Return to the dashboard and run Sync Gmail.",
      isSuccess: true,
    });
    response.cookies.delete(gmailOAuthStateCookieName);
    return response;
  } catch (error) {
    const response = renderOAuthResultPage({
      title: "Gmail was not connected",
      message: error instanceof Error ? error.message : "Unable to finish Gmail authorization.",
      isSuccess: false,
    });
    response.cookies.delete(gmailOAuthStateCookieName);
    return response;
  }
}
