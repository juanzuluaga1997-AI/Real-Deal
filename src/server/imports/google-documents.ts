import type { ImportSourceType } from "./types";

interface GoogleExportTarget {
  url: string;
  name: string;
  sourceType: ImportSourceType;
}

function getGoogleDocumentId(url: URL, marker: string): string | undefined {
  const match = url.pathname.match(new RegExp(`${marker}/([^/]+)`));
  return match?.[1];
}

function getSheetGid(url: URL): string | undefined {
  const gidFromHash = url.hash.match(/gid=([0-9]+)/)?.[1];
  return gidFromHash ?? url.searchParams.get("gid") ?? undefined;
}

export function getGoogleExportTarget(rawUrl: string): GoogleExportTarget | undefined {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (!url.hostname.includes("docs.google.com") && !url.hostname.includes("drive.google.com")) {
    return undefined;
  }

  const sheetId = getGoogleDocumentId(url, "spreadsheets/d");
  if (sheetId) {
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/export`);
    exportUrl.searchParams.set("format", "csv");
    const gid = getSheetGid(url);
    if (gid) {
      exportUrl.searchParams.set("gid", gid);
    }

    return {
      url: exportUrl.toString(),
      name: "Google Sheets import",
      sourceType: "google-sheets",
    };
  }

  const documentId = getGoogleDocumentId(url, "document/d");
  if (documentId) {
    return {
      url: `https://docs.google.com/document/d/${documentId}/export?format=txt`,
      name: "Google Docs import",
      sourceType: "google-docs",
    };
  }

  const presentationId = getGoogleDocumentId(url, "presentation/d");
  if (presentationId) {
    return {
      url: `https://docs.google.com/presentation/d/${presentationId}/export/pptx`,
      name: "Google Slides import",
      sourceType: "google-slides",
    };
  }

  const driveFileId = getGoogleDocumentId(url, "file/d");
  if (driveFileId) {
    return {
      url: `https://drive.google.com/uc?export=download&id=${driveFileId}`,
      name: "Google Drive file import",
      sourceType: "unknown",
    };
  }

  return undefined;
}
