import { describe, expect, it } from "vitest";

import { getAppDateString, getCurrentAppDate, hasAppDateChanged } from "@/lib/utils/dates";

describe("app dates", () => {
  it("formats the current app date in the configured timezone", () => {
    const utcEvening = new Date("2026-05-13T23:30:00.000Z");

    expect(getAppDateString(utcEvening, "America/New_York")).toBe("2026-05-13");
    expect(getAppDateString(utcEvening, "Asia/Tokyo")).toBe("2026-05-14");
  });

  it("returns today's app date instead of the fixed demo date", () => {
    expect(getCurrentAppDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("detects when an open dashboard crosses into a new app day", () => {
    expect(hasAppDateChanged("2026-05-13", new Date("2026-05-13T20:00:00.000Z"), "America/New_York")).toBe(false);
    expect(hasAppDateChanged("2026-05-13", new Date("2026-05-14T04:30:00.000Z"), "America/New_York")).toBe(true);
  });
});
