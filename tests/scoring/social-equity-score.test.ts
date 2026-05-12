import { describe, expect, it } from "vitest";

import { campaigns, people } from "@/lib/data/mock-data";
import { calculateSocialEquityScore } from "@/lib/scoring/social-equity-score";

describe("Social Equity Score", () => {
  it("rewards important relationships with strong campaign relevance", () => {
    const maya = people.find((person) => person.id === "maya-chen");

    expect(maya).toBeDefined();

    const score = calculateSocialEquityScore(maya!, campaigns, "2026-05-11");

    expect(score.total).toBeGreaterThanOrEqual(68);
    expect(score.components.relationshipImportance).toBe(100);
    expect(score.components.campaignRelevance).toBe(96);
  });

  it("raises decay risk when a relationship is beyond cadence and momentum is at risk", () => {
    const marcus = people.find((person) => person.id === "marcus-reed");

    expect(marcus).toBeDefined();

    const score = calculateSocialEquityScore(marcus!, campaigns, "2026-05-11");

    expect(score.daysOverdue).toBeGreaterThan(0);
    expect(score.decayRisk).toBeGreaterThanOrEqual(55);
    expect(score.components.decayResistance).toBeLessThan(50);
  });

  it("keeps recently touched relationships inside the expected cadence", () => {
    const grace = people.find((person) => person.id === "grace-turner");

    expect(grace).toBeDefined();

    const score = calculateSocialEquityScore(grace!, campaigns, "2026-05-11");

    expect(score.daysOverdue).toBe(0);
    expect(score.components.recency).toBeGreaterThanOrEqual(86);
  });
});
