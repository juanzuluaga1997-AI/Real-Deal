import type { CampaignStatus, CampaignType, RecommendationUrgency } from "@/lib/data/types";
import { cn } from "@/lib/utils/classnames";

const urgencyStyles: Record<RecommendationUrgency, string> = {
  critical: "border-[#e96f80]/40 bg-[#e96f80]/15 text-[#ffd9df]",
  high: "border-[#f4bd45]/40 bg-[#f4bd45]/15 text-[#ffe4a0]",
  medium: "border-[#79c7ff]/40 bg-[#79c7ff]/15 text-[#d8efff]",
  low: "border-[#2fb65d]/40 bg-[#2fb65d]/15 text-[#bcf5ca]",
};

const campaignStatusStyles: Record<CampaignStatus, string> = {
  active: "border-[#2fb65d]/40 bg-[#2fb65d]/15 text-[#bcf5ca]",
  planning: "border-[#79c7ff]/40 bg-[#79c7ff]/15 text-[#d8efff]",
  paused: "border-[#a8bdd0]/35 bg-white/10 text-[#edf7ff]",
  complete: "border-[#5da9e9]/40 bg-[#5da9e9]/15 text-[#d7ecff]",
};

export function formatCampaignType(type: CampaignType): string {
  const labels: Record<CampaignType, string> = {
    fundraising: "Fundraising",
    hiring: "Hiring",
    event: "Event",
    partnership: "Partnership",
    "customer-intros": "Customer intros",
  };

  return labels[type];
}

export function formatUrgency(urgency: RecommendationUrgency): string {
  return urgency.charAt(0).toUpperCase() + urgency.slice(1);
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: RecommendationUrgency | CampaignStatus | "neutral";
}) {
  const toneClass =
    tone === "neutral"
      ? "border-white/15 bg-white/10 text-[#edf7ff]"
      : tone in urgencyStyles
        ? urgencyStyles[tone as RecommendationUrgency]
        : campaignStatusStyles[tone as CampaignStatus];

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", toneClass)}>
      {label}
    </span>
  );
}
