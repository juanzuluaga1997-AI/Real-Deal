import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import { GET as getCampaigns } from "@/app/api/campaigns/route";
import { POST as syncGmail } from "@/app/api/integrations/gmail/sync/route";
import { GET as getGmailStatus } from "@/app/api/integrations/gmail/status/route";
import { POST as importContacts } from "@/app/api/imports/contacts/route";
import { GET as getPeople } from "@/app/api/people/route";
import { POST as emailReport } from "@/app/api/report/email/route";
import { GET as getReportPdf } from "@/app/api/report/pdf/route";
import { GET as getRecommendations } from "@/app/api/recommendations/route";

describe("API routes", () => {
  it("returns people with score explanations", async () => {
    const response = await getPeople();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.people.length).toBeGreaterThan(8);
    expect(payload.people[0].scoreExplanation).toEqual(expect.stringContaining("Social Equity Score"));
  });

  it("returns campaigns with target people", async () => {
    const response = await getCampaigns();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.campaigns[0].targetPeople.length).toBeGreaterThan(0);
  });

  it("returns daily recommendations with suggested actions", async () => {
    const response = await getRecommendations();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.recommendations[0].suggestedAction).toEqual(expect.any(String));
  });

  it("generates a PDF report", async () => {
    const response = await getReportPdf();
    const pdfText = Buffer.from(await response.arrayBuffer()).toString("latin1", 0, 8);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(pdfText).toBe("%PDF-1.4");
  });

  it("prepares an email delivery for the PDF report", async () => {
    const request = new Request("http://localhost/api/report/email", {
      method: "POST",
      body: JSON.stringify({ recipient: "avery@northstarlabs.com" }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const response = await emailReport(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.delivery.recipient).toBe("avery@northstarlabs.com");
    expect(payload.delivery.attachmentName).toBe("real-deal-relationship-report.pdf");
  });

  it("imports contacts from a spreadsheet file upload", async () => {
    const csv =
      "Name,Role,Company,Email,Campaign,Importance,Responsiveness\nMorgan Lee,Investor,Harbor Fund,morgan@example.com,Series A Readiness,High,90%\nMorgan Lee,Partner,Harbor Fund,morgan@example.com,Series A Readiness,8,High\nRiley Park,CEO,Oakline,riley@example.com,Strategic Customer Expansion,6,70%";
    const bytes = new TextEncoder().encode(csv);
    const file = {
      name: "contacts.csv",
      size: bytes.byteLength,
      arrayBuffer: async () => bytes.buffer,
    } as File;
    const request = {
      formData: async () =>
        ({
          get: (key: string) => (key === "file" ? file : null),
        }) as FormData,
    } as Request;

    const response = await importContacts(request);
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.result.recordCount).toBe(2);
    expect(payload.result.summary.totalRowsProcessed).toBe(3);
    expect(payload.result.summary.duplicatesMerged).toBe(1);
    expect(payload.result.summary.campaignsDetected).toContain("Series A Readiness");
    expect(payload.result.contacts[0].email).toBe("morgan@example.com");
    expect(payload.result.contacts[0].podName).toBe("Capital Circle");
  });

  it("imports contacts from an Excel workbook upload", async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Investors");
    worksheet.addRow(["Name", "Role", "Company", "Email"]);
    worksheet.addRow(["Jordan Ellis", "Investor", "North Pier Capital", "jordan@example.com"]);

    const workbookBuffer = await workbook.xlsx.writeBuffer();
    const bytes = Buffer.from(workbookBuffer);
    const file = {
      name: "investors.xlsx",
      size: bytes.byteLength,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    } as File;
    const request = {
      formData: async () =>
        ({
          get: (key: string) => (key === "file" ? file : null),
        }) as FormData,
    } as Request;

    const response = await importContacts(request);
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.result.recordCount).toBe(1);
    expect(payload.result.summary.contactsImported).toBe(1);
    expect(payload.result.contacts[0].name).toBe("Jordan Ellis");
    expect(payload.result.contacts[0].company).toBe("North Pier Capital");
  });

  it("imports a manually entered contact", async () => {
    const request = {
      formData: async () =>
        ({
          get: (key: string) =>
            key === "manualContact"
              ? JSON.stringify({
                  Name: "Grace Turner",
                  Email: "grace@example.com",
                  Company: "Brightwell Health",
                  Role: "CIO",
                  "Relationship type": "Customer",
                  Campaign: "Enterprise Design Partners",
                  "Importance level": "9",
                  Notes: "High-signal customer and design partner.",
                })
              : null,
        }) as FormData,
    } as Request;

    const response = await importContacts(request);
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(200);
    expect(payload.result.sourceType).toBe("manual");
    expect(payload.result.summary.contactsImported).toBe(1);
    expect(payload.result.contacts[0].name).toBe("Grace Turner");
    expect(payload.result.contacts[0].podName).toBe("Customer Signal");
    expect(payload.result.contacts[0].campaignNames).toContain("Enterprise Design Partners");
  });

  it("reports Gmail status without exposing a mailbox address", async () => {
    const response = getGmailStatus();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status.provider).toBe("gmail");
    expect(payload.status.accountAddressStoredInCode).toBe(false);
    expect(payload.status.connectUrl).toBe("/api/integrations/gmail/connect");
    expect(payload.status.tokenSource).toEqual(expect.stringMatching(/environment|local-oauth|none/));
    expect(payload.status.scopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
  });

  it("syncs Gmail relationship history through deterministic mock mode when OAuth is not configured", async () => {
    const originalEnvironment = {
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,
    };
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REFRESH_TOKEN;

    try {
      const request = new Request("http://localhost/api/integrations/gmail/sync", {
        method: "POST",
        body: JSON.stringify({
          contacts: [
            {
              personId: "grace-turner",
              name: "Grace Turner",
              company: "Brightwell Health",
              email: "grace@example.com",
            },
          ],
          lookbackDays: 365,
          maxMessagesPerContact: 2,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const response = await syncGmail(request);
      const payload = await response.json();

      expect(response.status, JSON.stringify(payload)).toBe(200);
      expect(payload.result.summary.configured).toBe(false);
      expect(payload.result.summary.messagesImported).toBe(2);
      expect(payload.result.events[0].personId).toBe("grace-turner");
      expect(payload.result.events[0].contactEmail).toBe("grace@example.com");
    } finally {
      Object.entries(originalEnvironment).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
          return;
        }

        process.env[key] = value;
      });
    }
  });
});
