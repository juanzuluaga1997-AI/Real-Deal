import { describe, expect, it } from "vitest";

import { getAppDateString, getCurrentAppDate } from "@/lib/utils/dates";

describe("app dates", () => {
  it("formats the current app date in the configured timezone", () => {
    const utcEvening = new Date("2026-05-13T23:30:00.000Z");

    expect(getAppDateString(utcEvening, "America/New_York")).toBe("2026-05-13");
    expect(getAppDateString(utcEvening, "Asia/Tokyo")).toBe("2026-05-14");
  });

  it("returns today's app date instead of the fixed demo date", () => {
    expect(getCurrentAppDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
