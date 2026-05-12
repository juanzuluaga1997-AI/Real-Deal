import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
}

export function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-5 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-[#a9fff0]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-[#fffaf0]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#c9c1ad]">{message}</p>
    </div>
  );
}
