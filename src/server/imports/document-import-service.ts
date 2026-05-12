import { basename, extname } from "node:path";
import { Readable } from "node:stream";

import ExcelJS from "exceljs";
import mammoth from "mammoth";
import JSZip from "jszip";

import { getGoogleExportTarget } from "./google-documents";
import { processImportedContactRows, processImportedContactText, type ContactImportRow } from "@/lib/import/contact-import";
import type { ImportedContactRecord, ImportResult, ImportSourceType, ImportSummary } from "@/lib/import/types";

interface ParsedImport {
  text: string;
  contacts: ImportedContactRecord[];
  summary: ImportSummary;
  warnings: string[];
}

const supportedExtensions = new Set([
  ".csv",
  ".txt",
  ".json",
  ".xlsx",
  ".xls",
  ".docx",
  ".pptx",
  ".pdf",
]);

function normalizeText(value: string): string {
  return value.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
}

function parsePlainTextBuffer(buffer: Buffer, sourceName: string): ParsedImport {
  const text = buffer.toString("utf8");
  const processed = processImportedContactText(text, sourceName);

  return {
    text,
    ...processed,
  };
}

function getSourceType(fileName: string): ImportSourceType {
  const extension = extname(fileName).toLowerCase();

  if (extension === ".xlsx" || extension === ".xls") {
    return "excel";
  }

  if (extension === ".csv") {
    return "csv";
  }

  if (extension === ".docx") {
    return "word";
  }

  if (extension === ".pptx") {
    return "powerpoint";
  }

  if (extension === ".pdf") {
    return "pdf";
  }

  if (extension === ".json") {
    return "json";
  }

  if (extension === ".txt") {
    return "text";
  }

  return "unknown";
}

function cellValueToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if ("text" in value && typeof value.text === "string") {
    return value.text;
  }

  if ("result" in value) {
    return cellValueToString(value.result as ExcelJS.CellValue);
  }

  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? "").join("");
  }

  return "";
}

function worksheetToRows(worksheet: ExcelJS.Worksheet): Array<Record<string, string>> {
  const rowValues: string[][] = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];

    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      values[columnNumber - 1] = cellValueToString(cell.value).trim();
    });

    if (values.some(Boolean)) {
      rowValues.push(values);
    }
  });

  if (rowValues.length === 0) {
    return [];
  }

  const headers = rowValues[0].map((value, index) => value || `Column ${index + 1}`);

  return rowValues.slice(1).map((values) =>
    headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {}),
  );
}

function worksheetToText(worksheet: ExcelJS.Worksheet): string {
  const lines: string[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];

    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      values[columnNumber - 1] = cellValueToString(cell.value).trim();
    });

    if (values.some(Boolean)) {
      lines.push(values.join(", "));
    }
  });

  return lines.join("\n");
}

async function parseWorkbook(
  buffer: Buffer,
  sourceName: string,
  sourceType: ImportSourceType,
): Promise<ParsedImport> {
  const workbook = new ExcelJS.Workbook();

  if (sourceType === "csv" || sourceType === "google-sheets") {
    await workbook.csv.read(Readable.from([buffer]));
  } else {
    try {
      const workbookBuffer = buffer as unknown as Parameters<typeof workbook.xlsx.load>[0];
      await workbook.xlsx.load(workbookBuffer);
    } catch (error) {
      if (extname(sourceName).toLowerCase() === ".xls") {
        return parsePlainTextBuffer(buffer, sourceName);
      }

      throw error;
    }
  }

  const rows: ContactImportRow[] = [];
  const textParts: string[] = [];

  workbook.worksheets.forEach((worksheet) => {
    rows.push(...worksheetToRows(worksheet));
    textParts.push(`Sheet: ${worksheet.name}`);
    textParts.push(worksheetToText(worksheet));
  });

  const processed = processImportedContactRows(rows, sourceName);

  return {
    text: textParts.join("\n"),
    ...processed,
  };
}

function parseJson(buffer: Buffer, sourceName: string): ParsedImport {
  const text = buffer.toString("utf8");
  const parsed = JSON.parse(text) as unknown;

  if (Array.isArray(parsed)) {
    const processed = processImportedContactRows(parsed as ContactImportRow[], sourceName);

    return {
      text,
      ...processed,
    };
  }

  if (parsed && typeof parsed === "object") {
    const objectRows = Object.values(parsed).filter((value) => value && typeof value === "object");

    if (objectRows.length > 0) {
      const processed = processImportedContactRows(objectRows as ContactImportRow[], sourceName);

      return {
        text,
        ...processed,
      };
    }
  }

  return parsePlainTextBuffer(buffer, sourceName);
}

async function parseWord(buffer: Buffer, sourceName: string): Promise<ParsedImport> {
  const result = await mammoth.extractRawText({ buffer });
  const processed = processImportedContactText(result.value, sourceName);

  return {
    text: result.value,
    ...processed,
  };
}

async function parsePowerPoint(buffer: Buffer, sourceName: string): Promise<ParsedImport> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((fileName) => /^ppt\/slides\/slide\d+\.xml$/.test(fileName))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const textParts: string[] = [];

  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async("text");
    const slideText = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)]
      .map((match) => match[1])
      .join(" ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");

    if (slideText.trim()) {
      textParts.push(slideText);
    }
  }

  const text = textParts.join("\n");
  const processed = processImportedContactText(text, sourceName);

  return {
    text,
    ...processed,
  };
}

async function parsePdf(buffer: Buffer, sourceName: string): Promise<ParsedImport> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const processed = processImportedContactText(result.text, sourceName);

    return {
      text: result.text,
      ...processed,
    };
  } finally {
    await parser.destroy();
  }
}

async function parseBuffer(buffer: Buffer, sourceName: string, sourceType: ImportSourceType): Promise<ParsedImport> {
  if (sourceType === "excel" || sourceType === "csv" || sourceType === "google-sheets") {
    return parseWorkbook(buffer, sourceName, sourceType);
  }

  if (sourceType === "json") {
    return parseJson(buffer, sourceName);
  }

  if (sourceType === "word" || sourceType === "google-docs") {
    if (sourceType === "google-docs") {
      const text = buffer.toString("utf8");
      const processed = processImportedContactText(text, sourceName);

      return {
        text,
        ...processed,
      };
    }

    return parseWord(buffer, sourceName);
  }

  if (sourceType === "powerpoint" || sourceType === "google-slides") {
    return parsePowerPoint(buffer, sourceName);
  }

  if (sourceType === "pdf") {
    return parsePdf(buffer, sourceName);
  }

  return parsePlainTextBuffer(buffer, sourceName);
}

export async function importContactsFromFile(file: File): Promise<ImportResult> {
  const sourceName = file.name;
  const extension = extname(sourceName).toLowerCase();

  if (!supportedExtensions.has(extension)) {
    throw new Error("Upload a supported file: Excel, CSV, Word, PowerPoint, PDF, JSON, or text.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sourceType = getSourceType(sourceName);
  const parsed = await parseBuffer(buffer, sourceName, sourceType);
  const text = normalizeText(parsed.text);

  return {
    sourceName,
    sourceType,
    parsedAt: new Date().toISOString(),
    recordCount: parsed.contacts.length,
    contacts: parsed.contacts,
    summary: parsed.summary,
    extractedTextPreview: text.slice(0, 900),
    warnings: [
      ...parsed.warnings,
      ...(parsed.contacts.length === 0 ? ["The document was readable, but no contact records were detected."] : []),
    ],
  };
}

export function importManualContact(contact: ContactImportRow): ImportResult {
  const sourceName = "Manual contact";
  const processed = processImportedContactRows([contact], sourceName);
  const text = normalizeText(Object.values(contact).filter(Boolean).join(" "));

  return {
    sourceName,
    sourceType: "manual",
    parsedAt: new Date().toISOString(),
    recordCount: processed.contacts.length,
    contacts: processed.contacts,
    summary: processed.summary,
    extractedTextPreview: text.slice(0, 900),
    warnings: processed.warnings,
  };
}

export async function importContactsFromGoogleUrl(rawUrl: string): Promise<ImportResult> {
  const exportTarget = getGoogleExportTarget(rawUrl);

  if (!exportTarget) {
    throw new Error("Enter a public Google Sheets, Docs, Slides, or Drive file URL.");
  }

  const response = await fetch(exportTarget.url);

  if (!response.ok) {
    throw new Error("The Google document could not be read. Confirm the link is publicly shared or upload an exported file.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sourceName = basename(exportTarget.name);
  const parsed = await parseBuffer(buffer, sourceName, exportTarget.sourceType);
  const text = normalizeText(parsed.text);

  return {
    sourceName: exportTarget.name,
    sourceType: exportTarget.sourceType,
    parsedAt: new Date().toISOString(),
    recordCount: parsed.contacts.length,
    contacts: parsed.contacts,
    summary: parsed.summary,
    extractedTextPreview: text.slice(0, 900),
    warnings: [
      ...parsed.warnings,
      ...(parsed.contacts.length === 0
        ? ["The Google document was readable, but no contact records were detected."]
        : ["Private Google files require a future OAuth connection. Public links and exported files are supported now."]),
    ],
  };
}
