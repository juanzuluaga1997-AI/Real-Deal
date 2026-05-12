import { memo } from "react";
import { ArrowRight, CalendarDays, Layers } from "lucide-react";

import { Panel } from "@/components/shared/panel";
import { ScoreMeter } from "@/components/shared/score-meter";
import { formatCampaignType, StatusBadge } from "@/components/shared/status-badge";
import type { CampaignInsight } from "@/lib/data/types";
import { formatShortDate } from "@/lib/utils/dates";

interface ActiveCampaignSummaryProps {
  campaigns: CampaignInsight[];
  selectedCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
  onOpenCampaigns: () => void;
}

function ActiveCampaignSummaryComponent({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onOpenCampaigns,
}: ActiveCampaignSummaryProps) {
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active" || campaign.status === "planning");

  return (
    <Panel
      eyebrow="Campaigns"
      icon={Layers}
      title="Active campaign summary"
      action={
        <button
          type="button"
          onClick={onOpenCampaigns}
          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-semibold text-[#fffaf0] transition hover:bg-white/10"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        {activeCampaigns.map((campaign) => (
          <button
            key={campaign.id}
            type="button"
            onClick={() => onSelectCampaign(campaign.id)}
            className={`rounded-lg border p-4 text-left transition ${
              selectedCampaignId === campaign.id
                ? "border-[#f4c95d]/50 bg-[#f4c95d]/10"
                : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#fffaf0]">{campaign.title}</p>
                <p className="mt-1 text-xs text-[#c9c1ad]">{formatCampaignType(campaign.type)}</p>
              </div>
              <StatusBadge label={campaign.status} tone={campaign.status} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#d8d2c3]">{campaign.objective}</p>
            <div className="mt-4">
              <ScoreMeter score={campaign.health} label="Campaign health" />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#c9c1ad]">
              <CalendarDays className="h-3.5 w-3.5 text-[#7dd3fc]" aria-hidden="true" />
              <span>Due {formatShortDate(campaign.dueDate)}</span>
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export const ActiveCampaignSummary = memo(ActiveCampaignSummaryComponent);
