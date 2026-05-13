import { NextResponse } from "next/server";

import { emailReportPdf } from "@/server/reports/email-service";
import { generateDashboardReportPdf } from "@/server/reports/pdf";
import { getDashboardReport } from "@/server/reports/report-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { recipient?: string };

    if (!body.recipient) {
      return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
    }

    const report = await getDashboardReport();
    const pdf = generateDashboardReportPdf(report);
    const delivery = await emailReportPdf(body.recipient, report, pdf);

    return NextResponse.json({
      delivery,
      message: `Report PDF prepared for ${delivery.recipient}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to email report PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
