import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/classnames";

interface PanelProps {
  title?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, icon: Icon, action, children, className }: PanelProps) {
  return (
    <section className={cn("glass-surface rounded-lg p-4 sm:p-5", className)}>
      {(title || eyebrow || action || Icon) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#7fe6a0]">{eyebrow}</p>}
            {title && (
              <div className="mt-1 flex min-w-0 items-center gap-2">
                {Icon && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-[#2fb65d]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <h2 className="truncate text-base font-semibold text-[#ffffff]">{title}</h2>
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
