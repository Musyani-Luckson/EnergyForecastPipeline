import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Rendered top-right - typically a status Badge. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Shared shell for every report section: icon, title, optional status badge.
 * Keeps the sections visually consistent without coupling them to each other.
 */
export function Section({
  icon: Icon,
  title,
  description,
  action,
  className,
  children,
}: SectionProps) {
  return (
    <Card className={cn("gap-4 py-5", className)}>
      <CardHeader className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid place-items-center size-8 rounded-lg bg-slate-100 text-slate-600 shrink-0">
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
              {description && (
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
    </Card>
  );
}

/** A labelled figure. The workhorse of the report's KPI grids. */
export function Stat({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5", className)}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums mt-0.5 text-slate-900", tone)}>{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

/** Responsive grid for Stat tiles. */
export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-2.5 grid-cols-2",
        cols === 4 && "sm:grid-cols-4",
        cols === 3 && "sm:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}
