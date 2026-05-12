import { memo } from "react";
import { Activity, ShieldCheck, TrendingDown, Users } from "lucide-react";

import { Panel } from "@/components/shared/panel";
import { ScoreMeter } from "@/components/shared/score-meter";
import type { CampaignInsight, PersonInsight } from "@/lib/data/types";

interface RelationshipHealthOverviewProps {
  people: PersonInsight[];
  campaigns: CampaignInsight[];
}

function RelationshipHealthOverviewComponent({ people, campaigns }: RelationshipHealthOverviewProps) {
  const averageScore = Math.round(
    people.reduce((total, person) => total + person.socialEquityScore.total, 0) / Math.max(people.length, 1),
  );
  const innerCircleCount = people.filter((person) => person.ring === "inner").length;
  const atRiskCount = people.filter((person) => person.socialEquityScore.decayRisk >= 55).length;
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active").length;

  const stats = [
    { label: "Inner circle", value: innerCircleCount, icon: ShieldCheck, tone: "text-[#6ee7b7]" },
    { label: "At risk", value: atRiskCount, icon: TrendingDown, tone: "text-[#fb7185]" },
    { label: "Active campaigns", value: activeCampaigns, icon: Activity, tone: "text-[#f4c95d]" },
    { label: "Tracked people", value: people.length, icon: Users, tone: "text-[#7dd3fc]" },
  ];

  return (
    <Panel eyebrow="Health" icon={Activity} title="Relationship health">
      <ScoreMeter score={averageScore} label="Average Social Equity Score" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <stat.icon className={`mb-3 h-4 w-4 ${stat.tone}`} aria-hidden="true" />
            <p className="font-mono text-2xl font-semibold text-[#fffaf0]">{stat.value}</p>
            <p className="mt-1 text-xs text-[#c9c1ad]">{stat.label}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export const RelationshipHealthOverview = memo(RelationshipHealthOverviewComponent);
