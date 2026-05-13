import { campaigns, people } from "@/lib/data/mock-data";
import { getDailyRecommendations } from "@/lib/recommendations/daily-recommendations";
import { getCurrentAppDate } from "@/lib/utils/dates";

export function getDailyFocusRecommendations(referenceDate: string | Date = getCurrentAppDate()) {
  return getDailyRecommendations(people, campaigns, { referenceDate, limit: 5 });
}
