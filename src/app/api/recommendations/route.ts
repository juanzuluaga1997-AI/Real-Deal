import { NextResponse } from "next/server";

import { getDailyFocusRecommendations } from "@/server/recommendations/service";

export async function GET() {
  try {
    const recommendations = getDailyFocusRecommendations();
    return NextResponse.json({ recommendations });
  } catch {
    return NextResponse.json({ error: "Unable to load recommendations." }, { status: 500 });
  }
}
