import { getDashboardReport } from "@/server/reports/report-service";
import { generateDashboardReportPdf } from "@/server/reports/pdf";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const report = await getDashboardReport();
    const pdf = generateDashboardReportPdf(report);
    const body = new ArrayBuffer(pdf.byteLength);
    new Uint8Array(body).set(pdf);

    return new Response(body, {
      headers: {
        "Content-Disposition": 'attachment; filename="real-deal-relationship-report.pdf"',
        "Content-Type": "application/pdf",
      },
    });
  } catch {
    return Response.json({ error: "Unable to generate report PDF." }, { status: 500 });
  }
}
