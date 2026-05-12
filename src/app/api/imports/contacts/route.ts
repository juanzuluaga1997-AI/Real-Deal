import { NextResponse } from "next/server";

import { importContactsFromFile, importContactsFromGoogleUrl, importManualContact } from "@/server/imports/document-import-service";
import type { ContactImportRow } from "@/lib/import/contact-import";

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    "size" in value &&
    typeof value.arrayBuffer === "function" &&
    typeof value.name === "string" &&
    typeof value.size === "number"
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const googleUrl = formData.get("googleUrl");
    const manualContact = formData.get("manualContact");

    if (isUploadedFile(file) && file.size > 0) {
      const result = await importContactsFromFile(file);
      return NextResponse.json({ result });
    }

    if (typeof manualContact === "string" && manualContact.trim()) {
      const result = importManualContact(JSON.parse(manualContact) as ContactImportRow);
      return NextResponse.json({ result });
    }

    if (typeof googleUrl === "string" && googleUrl.trim()) {
      const result = await importContactsFromGoogleUrl(googleUrl.trim());
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Upload a file, enter a public Google document URL, or add a contact manually." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import contacts.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
