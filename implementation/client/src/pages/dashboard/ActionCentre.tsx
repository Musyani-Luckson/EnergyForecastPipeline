import { ListChecks } from "lucide-react";

import type { QualityReport } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";
import { recommendedActions, type Tone } from "./narrative";

const ACCENT: Record<Tone, string> = {
  good: "border-l-emerald-400",
  watch: "border-l-amber-400",
  risk: "border-l-rose-400",
};

/**
 * The difference between analytics and decision support: every finding paired
 * with something the manager can actually do about it.
 */
export default function ActionCentre({
  insights,
  report,
}: {
  insights: ForecastInsights;
  report?: QualityReport | null;
}) {
  const actions = recommendedActions(insights, report);
  const urgent = actions.filter((a) => a.tone !== "good").length;

  return (
    <Section
      icon={ListChecks}
      title="Recommended Actions"
      description="What to do about this forecast."
      action={
        <Badge variant={urgent === 0 ? "success" : "warning"}>
          {urgent === 0 ? "Nothing urgent" : `${urgent} to act on`}
        </Badge>
      }
    >
      <div className="space-y-2.5">
        {actions.map((a, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg border border-slate-200 border-l-4 bg-white px-4 py-3",
              ACCENT[a.tone],
            )}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{a.detail}</p>
              </div>
              {a.metric && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {a.metric.label}
                  </p>
                  <p className="text-base font-bold tabular-nums text-slate-900">
                    {a.metric.value}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
