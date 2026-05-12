import type { CampaignStatus, CampaignType, RecommendationUrgency } from "@/lib/data/types";
import { cn } from "@/lib/utils/classnames";

const urgencyStyles: Record<RecommendationUrgency, string> = {
  critical: "border-[#fb7185]/40 bg-[#fb7185]/15 text-[#fecdd3]",
  high: "border-[#f4c95d]/40 bg-[#f4c95d]/15 text-[#fde68a]",
  medium: "border-[#7dd3fc]/40 bg-[#7dd3fc]/15 text-[#bae6fd]",
  low: "border-[#6ee7b7]/40 bg-[#6ee7b7]/15 text-[#bbf7d0]",
};

const campaignStatusStyles: Record<CampaignStatus, string> = {
  active: "border-[#6ee7b7]/40 bg-[#6ee7b7]/15 text-[#bbf7d0]",
  planning: "border-[#7dd3fc]/40 bg-[#7dd3fc]/15 text-[#bae6fd]",
  paused: "border-[#c9c1ad]/35 bg-white/10 text-[#e7dfd0]",
  complete: "border-[#a78bfa]/40 bg-[#a78bfa]/15 text-[#ddd6fe]",
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
      ? "border-white/15 bg-white/10 text-[#e7dfd0]"
      : tone in urgencyStyles
        ? urgencyStyles[tone as RecommendationUrgency]
        : campaignStatusStyles[tone as CampaignStatus];

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium", toneClass)}>
      {label}
    </span>
  );
}
