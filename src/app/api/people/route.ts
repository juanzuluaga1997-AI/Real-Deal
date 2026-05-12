import { NextResponse } from "next/server";

import { getPeopleWithInsights } from "@/server/people/service";

export async function GET() {
  try {
    const people = await getPeopleWithInsights();
    return NextResponse.json({ people });
  } catch {
    return NextResponse.json({ error: "Unable to load people." }, { status: 500 });
  }
}
