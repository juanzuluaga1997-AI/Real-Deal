import { NextResponse } from "next/server";

import { getCampaignsWithPeople } from "@/server/campaigns/service";
import { getPeopleWithInsights } from "@/server/people/service";

export async function GET() {
  try {
    const people = await getPeopleWithInsights();
    const campaigns = getCampaignsWithPeople(people);
    return NextResponse.json({ campaigns });
  } catch {
    return NextResponse.json({ error: "Unable to load campaigns." }, { status: 500 });
  }
}
