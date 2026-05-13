import { cn } from "@/lib/utils/classnames";

function getScoreColor(score: number): string {
  if (score >= 82) {
    return "bg-[#2fb65d]";
  }

  if (score >= 68) {
    return "bg-[#79c7ff]";
  }

  if (score >= 52) {
    return "bg-[#f4bd45]";
  }

  return "bg-[#e96f80]";
}

export function ScoreMeter({ score, label, className }: { score: number; label?: string; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-medium uppercase tracking-[0.16em] text-[#a8bdd0]">
          {label ?? "Score"}
        </span>
        <span className="font-mono text-sm font-semibold text-[#ffffff]">{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-md bg-white/10">
        <div className={cn("h-full rounded-md", getScoreColor(score))} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
