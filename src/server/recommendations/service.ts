import { campaigns, people } from "@/lib/data/mock-data";
import { getDailyRecommendations } from "@/lib/recommendations/daily-recommendations";
import { DEMO_TODAY } from "@/lib/utils/dates";

export function getDailyFocusRecommendations(referenceDate: string | Date = DEMO_TODAY) {
  return getDailyRecommendations(people, campaigns, { referenceDate, limit: 5 });
}
