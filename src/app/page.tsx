import { FounderWorkspace } from "@/components/dashboard/founder-workspace";
import { founderProfile, pods } from "@/lib/data/mock-data";
import { DEFAULT_APP_TIME_ZONE, getCurrentAppDate } from "@/lib/utils/dates";
import { getCampaignsWithPeople } from "@/server/campaigns/service";
import { getPeopleWithInsights } from "@/server/people/service";
import { getDailyFocusRecommendations } from "@/server/recommendations/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const appTimeZone = process.env.REAL_DEAL_TIME_ZONE ?? DEFAULT_APP_TIME_ZONE;
  const generatedAt = getCurrentAppDate(appTimeZone);
  const people = await getPeopleWithInsights(generatedAt);
  const campaigns = getCampaignsWithPeople(people);
  const recommendations = getDailyFocusRecommendations(generatedAt);

  return (
    <FounderWorkspace
      campaigns={campaigns}
      founder={founderProfile}
      appTimeZone={appTimeZone}
      generatedAt={generatedAt}
      people={people}
      pods={pods}
      recommendations={recommendations}
    />
  );
}
