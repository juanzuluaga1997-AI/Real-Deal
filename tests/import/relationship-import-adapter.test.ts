import { describe, expect, it } from "vitest";

import { buildImportedRelationshipState } from "@/lib/import/relationship-import-adapter";
import type { ImportResult } from "@/lib/import/types";
import { DEMO_TODAY } from "@/lib/utils/dates";
import { getCampaignsWithPeople } from "@/server/campaigns/service";
import { getPeopleWithInsights } from "@/server/people/service";
import { getDailyFocusRecommendations } from "@/server/recommendations/service";

describe("relationship import adapter", () => {
  it("turns imported contacts into active people, campaigns, and recommendations", async () => {
    const basePeople = await getPeopleWithInsights(DEMO_TODAY);
    const baseCampaigns = getCampaignsWithPeople(basePeople);
    const baseRecommendations = getDailyFocusRecommendations(DEMO_TODAY);
    const importResult: ImportResult = {
      sourceName: "contacts.csv",
      sourceType: "csv",
      parsedAt: "2026-05-11T18:00:00.000Z",
      recordCount: 1,
      summary: {
        totalRowsProcessed: 1,
        contactsImported: 1,
        duplicatesMerged: 0,
        rowsNeedingReview: 0,
        campaignsDetected: ["Strategic Customer Expansion"],
        podsAssigned: [{ podId: "customer-signal", podName: "Customer Signal", count: 1 }],
        reviewIssues: [],
      },
      contacts: [
        {
          id: "import-1",
          rowNumbers: [2],
          name: "Morgan Lee",
          role: "CIO",
          company: "Harbor Health",
          email: "morgan@example.com",
          tags: ["Enterprise"],
          campaignNames: ["Strategic Customer Expansion"],
          campaignIds: ["strategiccustomerexpansion"],
          importanceLevel: 10,
          source: "contacts.csv",
          followUpCommitment: "Ask Morgan whether the expansion workflow review is still active.",
          lastInteractionDate: "2026-03-01",
          introHistory: "Morgan asked for a product review after the last enterprise expansion conversation.",
          podId: "customer-signal",
          podName: "Customer Signal",
          category: "Customer",
          ring: "inner",
          initialSocialEquityScore: 86,
          decayRisk: 95,
          status: "ready",
          validationIssues: [],
          mergedFrom: 1,
        },
      ],
      extractedTextPreview: "Morgan Lee, CIO, Harbor Health",
      warnings: [],
    };

    const state = buildImportedRelationshipState({
      baseCampaigns,
      basePeople,
      baseRecommendations,
      importHistory: [importResult],
      referenceDate: DEMO_TODAY,
    });

    expect(state.importedPeopleCount).toBe(1);
    expect(state.people.some((person) => person.id === "imported-import-1")).toBe(true);
    expect(state.campaigns.some((campaign) => campaign.id === "strategiccustomerexpansion")).toBe(true);
    expect(
      state.campaigns
        .find((campaign) => campaign.id === "strategiccustomerexpansion")
        ?.targetPeople.some((person) => person.id === "imported-import-1"),
    ).toBe(true);
    expect(state.recommendations.some((recommendation) => recommendation.personId === "imported-import-1")).toBe(true);
  });
});
