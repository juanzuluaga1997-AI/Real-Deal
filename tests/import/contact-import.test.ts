import { describe, expect, it } from "vitest";

import { processImportedContactRows } from "@/lib/import/contact-import";

describe("contact import processing", () => {
  it("normalizes rows, merges duplicates, assigns pods, detects campaigns, and scores contacts", () => {
    const result = processImportedContactRows(
      [
        {
          Name: "Morgan Lee",
          Email: "Morgan@Example.com",
          Company: "Harbor Fund",
          Role: "Partner",
          "Relationship type": "Potential investor",
          Campaign: "Series A Readiness",
          "Last interaction date": "5/1/2026",
          Tags: "Series A; warm intro",
          "Importance level": "High",
          Responsiveness: "90%",
          "Follow-up commitment": "Send the partner memo.",
        },
        {
          Name: "Morgan Lee",
          Email: "morgan@example.com",
          Company: "Harbor Fund",
          Notes: "Met through a trusted advisor.",
          "Intro history": "Introduced by Maya Chen",
        },
        {
          Name: "",
          Company: "",
          Email: "not an email",
          Notes: "Needs review because identity is weak.",
        },
      ],
      "founder-network.csv",
    );

    expect(result.summary.totalRowsProcessed).toBe(3);
    expect(result.summary.contactsImported).toBe(2);
    expect(result.summary.duplicatesMerged).toBe(1);
    expect(result.summary.rowsNeedingReview).toBe(1);
    expect(result.summary.campaignsDetected).toContain("Series A Readiness");
    expect(result.summary.podsAssigned[0].podName).toBe("Capital Circle");

    const morgan = result.contacts.find((contact) => contact.email === "morgan@example.com");
    expect(morgan).toMatchObject({
      name: "Morgan Lee",
      podName: "Capital Circle",
      category: "Investor",
      ring: "inner",
      mergedFrom: 2,
    });
    expect(morgan?.initialSocialEquityScore).toBeGreaterThan(70);
    expect(morgan?.tags).toEqual(expect.arrayContaining(["Series A", "warm intro"]));
  });

  it("classifies hiring and customer contacts when explicit campaign fields are missing", () => {
    const result = processImportedContactRows(
      [
        {
          Name: "Priya Shah",
          Role: "Executive Recruiter",
          Company: "Northline Talent",
          Notes: "Can help with VP Engineering Search.",
          Importance: "8",
        },
        {
          Name: "Grace Turner",
          Role: "CIO",
          Company: "Brightwell Health",
          Notes: "Enterprise design partner with urgent workflow demand.",
          Importance: "9",
        },
      ],
      "strategic-contacts.csv",
    );

    expect(result.summary.campaignsDetected).toEqual(expect.arrayContaining(["Enterprise Design Partners", "VP Engineering Search"]));
    expect(result.contacts.map((contact) => contact.podName)).toEqual(expect.arrayContaining(["Hiring Network", "Customer Signal"]));
  });

  it("handles more than one thousand spreadsheet contacts", () => {
    const rows = Array.from({ length: 1005 }, (_, index) => ({
      Name: `Strategic Contact ${index + 1}`,
      Email: `contact-${index + 1}@example.com`,
      Company: `Account ${index + 1}`,
      Role: index % 2 === 0 ? "Investor" : "CIO",
      Importance: index % 2 === 0 ? "8" : "6",
      Campaign: index % 2 === 0 ? "Series A Readiness" : "Enterprise Design Partners",
    }));

    const result = processImportedContactRows(rows, "large-founder-network.csv");

    expect(result.summary.totalRowsProcessed).toBe(1005);
    expect(result.summary.contactsImported).toBe(1005);
    expect(result.summary.rowsNeedingReview).toBe(0);
    expect(result.contacts[0].initialSocialEquityScore).toBeGreaterThan(0);
  });
});
