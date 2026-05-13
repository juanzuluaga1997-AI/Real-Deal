export const DEMO_TODAY = "2026-05-11";
export const DEFAULT_APP_TIME_ZONE = "America/New_York";

const dayInMilliseconds = 24 * 60 * 60 * 1000;

export function getAppDateString(value: string | Date, timeZone: string = DEFAULT_APP_TIME_ZONE): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const dateParts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  })
    .formatToParts(value)
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== "literal") {
        parts[part.type] = part.value;
      }

      return parts;
    }, {});

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export function getCurrentAppDate(timeZone: string = DEFAULT_APP_TIME_ZONE): string {
  return getAppDateString(new Date(), timeZone);
}

export function toUtcDay(value: string | Date): number {
  if (typeof value === "string") {
    return Date.parse(`${value}T00:00:00.000Z`);
  }

  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function daysBetween(laterDate: string | Date, earlierDate: string | Date): number {
  return Math.max(0, Math.round((toUtcDay(laterDate) - toUtcDay(earlierDate)) / dayInMilliseconds));
}

export function daysUntil(laterDate: string | Date, referenceDate: string | Date): number {
  return Math.round((toUtcDay(laterDate) - toUtcDay(referenceDate)) / dayInMilliseconds);
}

export function isOnOrBefore(date: string, referenceDate: string | Date): boolean {
  return toUtcDay(date) <= toUtcDay(referenceDate);
}

export function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00.000Z`));
}
