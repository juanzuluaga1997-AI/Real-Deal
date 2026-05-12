import type { DashboardReport } from "./types";

interface PdfLine {
  text: string;
  size: number;
  bold?: boolean;
  gapAfter?: number;
  indent?: number;
}

interface DrawLine extends PdfLine {
  x: number;
  y: number;
}

const pageWidth = 612;
const pageHeight = 792;
const margin = 54;
const contentWidth = pageWidth - margin * 2;

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\s+/g, " ").trim();
}

function wrapText(text: string, size: number, indent = 0): string[] {
  const maxCharacters = Math.max(34, Math.floor((contentWidth - indent) / (size * 0.49)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length > maxCharacters && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function addWrappedLine(lines: PdfLine[], text: string, options: Omit<PdfLine, "text">) {
  const wrappedLines = wrapText(text, options.size, options.indent);

  wrappedLines.forEach((line, index) => {
    lines.push({
      ...options,
      text: line,
      gapAfter: index === wrappedLines.length - 1 ? options.gapAfter : 1,
    });
  });
}

function getReportLines(report: DashboardReport): PdfLine[] {
  const lines: PdfLine[] = [
    { text: report.title, size: 22, bold: true, gapAfter: 8 },
    {
      text: `${report.founder.name}, ${report.founder.company} | Generated ${report.generatedAt}`,
      size: 10,
      gapAfter: 14,
    },
    { text: "Dashboard Summary", size: 14, bold: true, gapAfter: 4 },
    {
      text: `Average score ${report.health.averageScore}. Inner circle ${report.health.innerCircleCount}. At-risk relationships ${report.health.atRiskCount}. Active campaigns ${report.health.activeCampaignCount}. Tracked people ${report.health.trackedPeopleCount}.`,
      size: 10,
      gapAfter: 14,
    },
    { text: "Daily Focus Queue", size: 14, bold: true, gapAfter: 6 },
  ];

  report.recommendations.forEach((recommendation, index) => {
    lines.push({
      text: `${index + 1}. ${recommendation.personName} | ${recommendation.personRole}, ${recommendation.personCompany}`,
      size: 11,
      bold: true,
      gapAfter: 2,
    });
    addWrappedLine(lines, `Urgency: ${recommendation.urgency}. Score: ${recommendation.relationshipScore}.`, {
      size: 10,
      indent: 14,
      gapAfter: 1,
    });
    addWrappedLine(lines, `Reason: ${recommendation.reason}`, { size: 10, indent: 14, gapAfter: 1 });
    addWrappedLine(lines, `Action: ${recommendation.suggestedAction}`, { size: 10, indent: 14, gapAfter: 8 });
  });

  lines.push({ text: "Active Campaigns", size: 14, bold: true, gapAfter: 6 });

  report.activeCampaigns.forEach((campaign) => {
    lines.push({
      text: `${campaign.title} | ${campaign.stage} | Health ${campaign.health}`,
      size: 11,
      bold: true,
      gapAfter: 2,
    });
    addWrappedLine(lines, campaign.objective, { size: 10, indent: 14, gapAfter: 5 });
  });

  lines.push({ text: "Relationships Losing Momentum", size: 14, bold: true, gapAfter: 6 });

  report.priorityRelationships.forEach((person) => {
    addWrappedLine(
      lines,
      `${person.name}: score ${person.socialEquityScore.total}, decay risk ${person.socialEquityScore.decayRisk}. ${person.recommendedNextAction}`,
      { size: 10, gapAfter: 5 },
    );
  });

  return lines;
}

function paginate(lines: PdfLine[]): DrawLine[][] {
  const pages: DrawLine[][] = [];
  let currentPage: DrawLine[] = [];
  let y = pageHeight - margin;

  for (const line of lines) {
    const lineHeight = Math.ceil(line.size * 1.35);
    const gapAfter = line.gapAfter ?? 3;

    if (y - lineHeight < margin) {
      pages.push(currentPage);
      currentPage = [];
      y = pageHeight - margin;
    }

    currentPage.push({
      ...line,
      x: margin + (line.indent ?? 0),
      y,
    });
    y -= lineHeight + gapAfter;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function renderPageContent(lines: DrawLine[]): string {
  return lines
    .map((line) => {
      const font = line.bold ? "F2" : "F1";
      return `BT /${font} ${line.size} Tf ${line.x} ${line.y} Td (${escapePdfText(line.text)}) Tj ET`;
    })
    .join("\n");
}

function padOffset(offset: number): string {
  return offset.toString().padStart(10, "0");
}

export function generateDashboardReportPdf(report: DashboardReport): Buffer {
  const pages = paginate(getReportLines(report));
  const objects: Array<{ id: number; body: string }> = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    {
      id: 2,
      body: `<< /Type /Pages /Kids [${pages.map((_page, index) => `${5 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    },
    { id: 3, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
    { id: 4, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>" },
  ];

  pages.forEach((page, index) => {
    const pageObjectId = 5 + index * 2;
    const contentObjectId = pageObjectId + 1;
    const content = renderPageContent(page);

    objects.push({
      id: pageObjectId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    });
    objects.push({
      id: contentObjectId,
      body: `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    });
  });

  objects.sort((left, right) => left.id - right.id);

  const offsets: number[] = [0];
  let pdf = "%PDF-1.4\n";

  for (const object of objects) {
    offsets[object.id] = Buffer.byteLength(pdf, "latin1");
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= objects.length; id += 1) {
    pdf += `${padOffset(offsets[id])} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
