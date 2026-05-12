import { describe, expect, it } from "vitest";

import { campaigns, people } from "@/lib/data/mock-data";
import { getDailyRecommendations } from "@/lib/recommendations/daily-recommendations";

describe("daily recommendations", () => {
  it("returns a focused queue of three to five people", () => {
    const recommendations = getDailyRecommendations(people, campaigns, { referenceDate: "2026-05-11", limit: 5 });

    expect(recommendations.length).toBeGreaterThanOrEqual(3);
    expect(recommendations.length).toBeLessThanOrEqual(5);
  });

  it("prioritizes overdue commitments tied to active campaigns", () => {
    const recommendations = getDailyRecommendations(people, campaigns, { referenceDate: "2026-05-11", limit: 5 });
    const ids = recommendations.map((recommendation) => recommendation.personId);

    expect(ids).toContain("maya-chen");
    expect(ids).toContain("priya-shah");
    expect(ids).toContain("marcus-reed");
    expect(recommendations.every((recommendation) => recommendation.reason.length > 30)).toBe(true);
  });

  it("returns deterministic results for the same input", () => {
    const first = getDailyRecommendations(people, campaigns, { referenceDate: "2026-05-11", limit: 5 });
    const second = getDailyRecommendations(people, campaigns, { referenceDate: "2026-05-11", limit: 5 });

    expect(second).toEqual(first);
  });
});
