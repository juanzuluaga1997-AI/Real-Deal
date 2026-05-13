import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FounderWorkspace } from "@/components/dashboard/founder-workspace";
import { ReportExportPanel } from "@/components/reports/report-export-panel";
import { founderProfile, pods } from "@/lib/data/mock-data";
import { DEFAULT_APP_TIME_ZONE, DEMO_TODAY } from "@/lib/utils/dates";
import { getCampaignsWithPeople } from "@/server/campaigns/service";
import { getPeopleWithInsights } from "@/server/people/service";
import { getDailyFocusRecommendations } from "@/server/recommendations/service";

async function renderWorkspace() {
  const people = await getPeopleWithInsights(DEMO_TODAY);
  const campaigns = getCampaignsWithPeople(people);
  const recommendations = getDailyFocusRecommendations(DEMO_TODAY);

  render(
    <FounderWorkspace
      appTimeZone={DEFAULT_APP_TIME_ZONE}
      campaigns={campaigns}
      founder={founderProfile}
      generatedAt={DEMO_TODAY}
      people={people}
      pods={pods}
      recommendations={recommendations}
    />,
  );
}

describe("FounderWorkspace", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the real dashboard as the first screen", async () => {
    await renderWorkspace();

    expect(screen.getByRole("heading", { name: "Real Deal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Daily focus queue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Relationship map" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Relationship calendar" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /May 11, 2026/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Report" })).toHaveAttribute("href", "/report");
    expect(screen.getByRole("button", { name: "Save dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All contacts" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Dashboard report" })).not.toBeInTheDocument();
  });

  it("opens calendar activity and selects the related contact", async () => {
    const user = userEvent.setup();
    await renderWorkspace();

    await user.click(screen.getByRole("button", { name: /May 9, 2026/ }));
    await user.click(screen.getByRole("button", { name: "Open Maya Chen from calendar event" }));

    expect(screen.getByRole("heading", { name: "Maya Chen" })).toBeInTheDocument();
    expect(screen.getAllByText("Send the revised metrics memo and ask for one pointed narrative critique.").length).toBeGreaterThan(0);
  });

  it("opens the campaigns workspace and selects a campaign", async () => {
    const user = userEvent.setup();
    await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Campaigns" }));
    await user.click(screen.getAllByRole("button", { name: /Cloud Partner Motion/i })[0]);

    expect(screen.getByRole("heading", { name: "Cloud Partner Motion" })).toBeInTheDocument();
    expect(screen.getByText("Target people")).toBeInTheDocument();
  });

  it("searches contacts and opens the selected relationship", async () => {
    const user = userEvent.setup();
    await renderWorkspace();

    await user.type(screen.getByLabelText("Search contacts"), "Marcus");
    await user.click(await screen.findByRole("button", { name: "Select Marcus Reed from search" }));

    expect(screen.getByRole("heading", { name: "Marcus Reed" })).toBeInTheDocument();
    expect(screen.getAllByText(/Cloudlane/).length).toBeGreaterThan(0);
  });

  it("opens all saved contacts in a searchable window", async () => {
    const user = userEvent.setup();
    await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "All contacts" }));

    expect(screen.getByRole("heading", { name: "All contacts" })).toBeInTheDocument();
    expect(screen.getByText("14 saved contacts in the active relationship system.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search all contacts"), "Maya");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText(/Showing \d+ of 14 contacts for "Maya"\./)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open Maya Chen from all contacts" }));

    expect(screen.queryByRole("heading", { name: "All contacts" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Maya Chen" })).toBeInTheDocument();
    expect(screen.getAllByText(/Meridian Ventures/).length).toBeGreaterThan(0);
  });

  it("selects a daily focus card from anywhere on the card", async () => {
    const user = userEvent.setup();
    await renderWorkspace();

    await user.click(screen.getByText(/Priya Shah has a follow-up commitment due now/i));

    expect(screen.getByRole("heading", { name: "Priya Shah" })).toBeInTheDocument();
    expect(screen.getAllByText(/LedgerWorks/).length).toBeGreaterThan(0);
  });

  it("creates and deletes manual campaigns while keeping manual contact campaign options current", async () => {
    const user = userEvent.setup();
    await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Campaigns" }));
    await user.type(screen.getByLabelText("Campaign title"), "Advisor Network Sprint");
    await user.type(screen.getByLabelText("Objective"), "Activate advisors who can help sharpen the enterprise narrative.");
    await user.type(screen.getByLabelText("Search contacts to add"), "Maya");
    await user.click(await screen.findByRole("button", { name: "Add Maya Chen to campaign" }));
    await user.click(screen.getByRole("button", { name: "Create campaign" }));

    expect(await screen.findByRole("heading", { name: "Advisor Network Sprint" })).toBeInTheDocument();
    expect(screen.getAllByText("Maya Chen").length).toBeGreaterThan(0);
    expect(screen.getByText("Created campaign Advisor Network Sprint with 1 target contact.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Upload contacts" }));
    await user.selectOptions(screen.getByLabelText("Import method"), "manual");
    expect(screen.getByRole("option", { name: "Advisor Network Sprint" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete campaign" }));

    expect(screen.getByText("Deleted campaign Advisor Network Sprint. It has been removed from active campaign lists.")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Advisor Network Sprint" })).not.toBeInTheDocument();
  });

  it("marks a recommended touch as planned", async () => {
    const user = userEvent.setup();
    await renderWorkspace();

    const planButtons = screen.getAllByRole("button", { name: "Plan" });
    await user.click(planButtons[0]);

    expect(screen.getByRole("button", { name: "Planned" })).toBeInTheDocument();
  });

  it("emails the report as a PDF from the report export panel", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          message: "Report PDF prepared for investor@example.com.",
          delivery: {
            recipient: "investor@example.com",
            attachmentName: "real-deal-relationship-report.pdf",
          },
        }),
      ),
    );

    render(<ReportExportPanel />);

    await user.clear(screen.getByLabelText("Recipient"));
    await user.type(screen.getByLabelText("Recipient"), "investor@example.com");
    await user.click(screen.getByRole("button", { name: "Email PDF" }));

    expect(await screen.findByText("Report PDF prepared for investor@example.com.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", "/api/report/pdf");
    expect(screen.getByRole("link", { name: "Open HTML" })).toHaveAttribute("href", "/report");
  });

  it("saves the dashboard and shows history for all tracked people", async () => {
    const user = userEvent.setup();
    await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Save dashboard" }));

    expect(await screen.findByText("Saved dashboard with 14 people in history.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Saved dashboard history" })).toBeInTheDocument();
    expect(screen.getByText("14 people captured")).toBeInTheDocument();
  });

  it("syncs Gmail email history into the selected relationship timeline", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.includes("/api/integrations/gmail/status")) {
          return Response.json({
            status: {
              provider: "gmail",
              configured: false,
              mode: "mock",
              missingFields: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
              scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
              accountAddressStoredInCode: false,
            },
          });
        }

        if (url.includes("/api/integrations/gmail/sync")) {
          return Response.json({
            result: {
              sourceName: "Gmail",
              syncedAt: "2026-05-11T18:00:00.000Z",
              summary: {
                provider: "gmail",
                mode: "mock",
                configured: false,
                scannedContacts: 14,
                matchedContacts: 1,
                messagesImported: 1,
                latestEmailDate: "2026-05-10T15:00:00.000Z",
                warnings: ["Gmail OAuth credentials are not configured. Deterministic demo email history was used."],
              },
              events: [
                {
                  id: "gmail-maya-message-1",
                  personId: "maya-chen",
                  messageId: "message-1",
                  date: "2026-05-10T15:00:00.000Z",
                  direction: "received",
                  subject: "Re: Series A memo",
                  snippet: "Maya replied with feedback on the metrics memo and asked for the next investor update.",
                },
              ],
            },
          });
        }

        return Response.json({});
      }),
    );
    await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Sync Gmail" }));
    expect(await screen.findByRole("heading", { name: "Gmail relationship sync" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run sync" }));

    expect(await screen.findByText("Synced 1 Gmail email across 1 relationship.")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Open Maya Chen"));
    expect(await screen.findByText("Email history")).toBeInTheDocument();
    expect(await screen.findByText("1 synced")).toBeInTheDocument();
    expect(await screen.findByText("Received")).toBeInTheDocument();
    expect(screen.getAllByText("Re: Series A memo").length).toBeGreaterThan(0);
    expect(await screen.findByText("Gmail received: Re: Series A memo")).toBeInTheDocument();
    expect(await screen.findByText(/Gmail history: 1 email message synced/)).toBeInTheDocument();
    expect(screen.getByText("Synced 1 Gmail email into relationship history.")).toBeInTheDocument();
  });

  it("opens the upload contacts panel and previews imported contacts", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          result: {
            sourceName: "contacts.csv",
            sourceType: "csv",
            parsedAt: "2026-05-11T18:00:00.000Z",
            recordCount: 1,
            summary: {
              totalRowsProcessed: 1,
              contactsImported: 1,
              duplicatesMerged: 0,
              rowsNeedingReview: 0,
              campaignsDetected: ["Series A Readiness"],
              podsAssigned: [{ podId: "capital-circle", podName: "Capital Circle", count: 1 }],
              reviewIssues: [],
            },
            contacts: [
              {
                id: "import-1",
                rowNumbers: [2],
                name: "Morgan Lee",
                role: "Investor",
                company: "Harbor Fund",
                email: "morgan@example.com",
                tags: ["Series A"],
                campaignNames: ["Series A Readiness"],
                campaignIds: ["series-a-readiness"],
                importanceLevel: 8,
                source: "contacts.csv",
                podId: "capital-circle",
                podName: "Capital Circle",
                category: "Investor",
                ring: "inner",
                initialSocialEquityScore: 84,
                decayRisk: 22,
                status: "ready",
                validationIssues: [],
                mergedFrom: 1,
              },
            ],
            extractedTextPreview: "Morgan Lee, Investor, Harbor Fund",
            warnings: [],
          },
        }),
      ),
    );
    await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Upload contacts" }));
    await user.selectOptions(screen.getByLabelText("Import method"), "google");
    await user.type(screen.getByLabelText("Public Google link"), "https://docs.google.com/spreadsheets/d/example/edit");
    await user.click(screen.getByRole("button", { name: "Import Google document" }));

    expect(await screen.findByText("Processed 1 rows from contacts.csv. Imported 1 contacts and merged 0 duplicates.")).toBeInTheDocument();
    expect(screen.getByText("Import summary")).toBeInTheDocument();
    expect(screen.getByText("Rows processed")).toBeInTheDocument();
    expect(screen.getAllByText("Morgan Lee").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Capital Circle").length).toBeGreaterThan(0);
    expect(screen.getByText("1 imported document snapshots")).toBeInTheDocument();
    expect(screen.getByText("Imported 1 contact into the active relationship system.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Morgan Lee" })).toBeInTheDocument();
  });

  it("adds a contact manually through the upload panel", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          result: {
            sourceName: "Manual contact",
            sourceType: "manual",
            parsedAt: "2026-05-11T18:00:00.000Z",
            recordCount: 1,
            summary: {
              totalRowsProcessed: 1,
              contactsImported: 1,
              duplicatesMerged: 0,
              rowsNeedingReview: 0,
              campaignsDetected: ["Enterprise Design Partners"],
              podsAssigned: [{ podId: "customer-signal", podName: "Customer Signal", count: 1 }],
              reviewIssues: [],
            },
            contacts: [
              {
                id: "manual-1",
                rowNumbers: [2],
                name: "Grace Turner",
                role: "CIO",
                company: "Brightwell Health",
                email: "grace@example.com",
                tags: ["Design partner"],
                campaignNames: ["Enterprise Design Partners"],
                campaignIds: ["enterprise-design-partners"],
                importanceLevel: 9,
                source: "Manual contact",
                podId: "customer-signal",
                podName: "Customer Signal",
                category: "Customer",
                ring: "inner",
                initialSocialEquityScore: 88,
                decayRisk: 18,
                status: "ready",
                validationIssues: [],
                mergedFrom: 1,
              },
            ],
            extractedTextPreview: "Grace Turner CIO Brightwell Health",
            warnings: [],
          },
        }),
      ),
    );
    await renderWorkspace();

    await user.click(screen.getByRole("button", { name: "Upload contacts" }));
    await user.selectOptions(screen.getByLabelText("Import method"), "manual");
    await user.type(screen.getByLabelText("Name"), "Grace Turner");
    await user.type(screen.getByLabelText("Email"), "grace@example.com");
    await user.type(screen.getByLabelText("Company"), "Brightwell Health");
    await user.type(screen.getByLabelText("Role"), "CIO");
    await user.selectOptions(screen.getByLabelText("Relationship type"), "Customer");
    await user.selectOptions(screen.getByLabelText("Campaign"), "Enterprise Design Partners");
    await user.click(screen.getByRole("button", { name: "Add contact" }));

    expect(await screen.findByText("Processed 1 rows from Manual contact. Imported 1 contacts and merged 0 duplicates.")).toBeInTheDocument();
    expect(screen.getAllByText("Grace Turner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Customer Signal").length).toBeGreaterThan(0);
    expect(screen.getByText("Imported 1 contact into the active relationship system.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Grace Turner" })).toBeInTheDocument();
  });
});
