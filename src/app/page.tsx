import { FounderWorkspace } from "@/components/dashboard/founder-workspace";
import { founderProfile, pods } from "@/lib/data/mock-data";
import { DEMO_TODAY } from "@/lib/utils/dates";
import { getCampaignsWithPeople } from "@/server/campaigns/service";
import { getPeopleWithInsights } from "@/server/people/service";
import { getDailyFocusRecommendations } from "@/server/recommendations/service";

export default async function Home() {
  const people = await getPeopleWithInsights(DEMO_TODAY);
  const campaigns = getCampaignsWithPeople(people);
  const recommendations = getDailyFocusRecommendations(DEMO_TODAY);

  return (
    <FounderWorkspace
      campaigns={campaigns}
      founder={founderProfile}
      generatedAt={DEMO_TODAY}
      people={people}
      pods={pods}
      recommendations={recommendations}
    />
  );
}
