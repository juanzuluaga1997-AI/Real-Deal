import { NextResponse } from "next/server";

import type { WorkspaceState } from "@/lib/workspace-state/types";
import { getWorkspaceState, mergeWorkspaceState } from "@/server/supabase/workspace-state";
import { isSupabaseConfigured } from "@/server/supabase/client";

export async function GET() {
  try {
    const { configured, state } = await getWorkspaceState();
    return NextResponse.json({
      persistence: {
        configured,
        provider: configured ? "supabase" : "local-browser",
      },
      state,
    });
  } catch {
    return NextResponse.json({ error: "Unable to load workspace state." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { state?: Partial<WorkspaceState> };
    const state = body.state;

    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return NextResponse.json({ error: "Workspace state is required." }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          persistence: {
            configured: false,
            provider: "local-browser",
          },
          state,
        },
        { status: 202 },
      );
    }

    const nextState = await mergeWorkspaceState(state);
    return NextResponse.json({
      persistence: {
        configured: true,
        provider: "supabase",
      },
      state: nextState,
    });
  } catch {
    return NextResponse.json({ error: "Unable to save workspace state." }, { status: 500 });
  }
}
