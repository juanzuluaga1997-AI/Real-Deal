import { NextResponse } from "next/server";

import { getCampaign } from "@/server/campaigns/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const campaign = getCampaign(id);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch {
    return NextResponse.json({ error: "Unable to load campaign." }, { status: 500 });
  }
}
