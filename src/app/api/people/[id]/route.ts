import { NextResponse } from "next/server";

import { getPersonWithInsight } from "@/server/people/service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const person = await getPersonWithInsight(id);

    if (!person) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }

    return NextResponse.json({ person });
  } catch {
    return NextResponse.json({ error: "Unable to load person." }, { status: 500 });
  }
}
