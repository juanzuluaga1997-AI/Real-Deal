import { createHash } from "node:crypto";

import type { DashboardReport } from "./types";

export interface ReportEmailResult {
  messageId: string;
  recipient: string;
  attachmentName: string;
  deliveryMode: "deterministic-mock";
}

function isValidEmail(recipient: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);
}

export async function emailReportPdf(recipient: string, report: DashboardReport, pdf: Buffer): Promise<ReportEmailResult> {
  const normalizedRecipient = recipient.trim().toLowerCase();

  if (!isValidEmail(normalizedRecipient)) {
    throw new Error("Enter a valid email address.");
  }

  const messageId = createHash("sha256")
    .update(`${normalizedRecipient}:${report.generatedAt}:${pdf.length}`)
    .digest("hex")
    .slice(0, 16);

  return {
    messageId: `real-deal-${messageId}`,
    recipient: normalizedRecipient,
    attachmentName: "real-deal-relationship-report.pdf",
    deliveryMode: "deterministic-mock",
  };
}
