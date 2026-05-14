import { emptyWorkspaceState, type WorkspaceState, type WorkspaceStatePayload } from "@/lib/workspace-state/types";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/server/supabase/client";

const workspaceStateId = "real-deal-default-workspace";
const workspaceStateKey = "default";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeWorkspaceState(value: unknown): WorkspaceStatePayload {
  const payload = isObject(value) ? value : {};

  return {
    savedDashboards: asArray(payload.savedDashboards),
    importHistory: asArray(payload.importHistory),
    emailSyncResult: isObject(payload.emailSyncResult) ? (payload.emailSyncResult as unknown as WorkspaceState["emailSyncResult"]) : null,
    manualCampaigns: asArray(payload.manualCampaigns),
    deletedCampaignIds: asArray<string>(payload.deletedCampaignIds).filter((campaignId) => typeof campaignId === "string"),
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date(0).toISOString(),
  };
}

export async function getWorkspaceState(): Promise<{
  configured: boolean;
  state: WorkspaceStatePayload;
}> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      state: {
        ...emptyWorkspaceState,
        updatedAt: new Date(0).toISOString(),
      },
    };
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      configured: false,
      state: {
        ...emptyWorkspaceState,
        updatedAt: new Date(0).toISOString(),
      },
    };
  }

  const { data, error } = await supabase
    .from("workspace_state")
    .select("payload")
    .eq("id", workspaceStateId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return {
    configured: true,
    state: normalizeWorkspaceState(data?.payload),
  };
}

export async function mergeWorkspaceState(patch: Partial<WorkspaceState>): Promise<WorkspaceStatePayload> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      ...emptyWorkspaceState,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  }

  const currentState = await getWorkspaceState();
  const nextState: WorkspaceStatePayload = {
    ...currentState.state,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from("workspace_state").upsert({
    id: workspaceStateId,
    state_key: workspaceStateKey,
    payload: nextState,
    updated_at: nextState.updatedAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  return nextState;
}
