import { Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { STAGES, STAGE_ORDER } from "@/pages/datasets/utils";
import { cn } from "@/lib/utils";
import type { Portfolio } from "./portfolio";

const BAR: Record<string, string> = {
  RAW: "bg-slate-400",
  CLEANED: "bg-blue-500",
  OUTLIERS: "bg-emerald-500",
  STATIONARY: "bg-amber-500",
  FORECAST: "bg-violet-600",
};

/**
 * Where every dataset currently sits. Bars show the count that *stopped* at
 * each stage, so a tall bar before FORECAST is a backlog rather than progress.
 */
export default function PipelineFunnel({ portfolio }: { portfolio: Portfolio }) {
  const max = Math.max(1, ...STAGE_ORDER.map((s) => portfolio.byStage[s]));

  return (
    <Section
      icon={Workflow}
      title="Pipeline Status"
      description="Where each dataset stopped along the pipeline."
      action={
        <Badge variant={portfolio.inProgress === 0 ? "success" : "warning"}>
          {portfolio.completed}/{portfolio.total} complete
        </Badge>
      }
    >
      <div className="space-y-2.5">
        {STAGES.map((meta) => {
          const count = portfolio.byStage[meta.key];
          const share = portfolio.total ? (count / portfolio.total) * 100 : 0;
          return (
            <div key={meta.key} className="flex items-center gap-3">
              <span className="text-xs text-slate-600 w-[92px] shrink-0">{meta.label}</span>
              <div className="flex-1 h-5 rounded bg-slate-100 overflow-hidden">
                <div
                  className={cn("h-full rounded transition-all duration-500", BAR[meta.key])}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums text-slate-700 w-[64px] text-right">
                {count} <span className="font-normal text-slate-400">({share.toFixed(0)}%)</span>
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        Counts the furthest stage each run reached — every dataset appears exactly once.
      </p>
    </Section>
  );
}
