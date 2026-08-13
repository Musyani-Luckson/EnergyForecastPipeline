import { Brain } from "lucide-react";

import type { QualityReport } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";
import { energyNarrative } from "./narrative";

const RISK_BADGE = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "destructive",
} as const;

/**
 * The plain-prose reading of the forecast — what a manager scans before the
 * chart. Every sentence is generated from a derived figure, so the narrative
 * can never claim more than the data supports.
 */
export default function EnergyIntelligence({
  insights,
  report,
}: {
  insights: ForecastInsights;
  report?: QualityReport | null;
}) {
  const lines = energyNarrative(insights, report);

  return (
    <Section
      icon={Brain}
      title="Energy Intelligence"
      description="What this forecast means for the building."
      action={
        <Badge variant={RISK_BADGE[insights.overallRisk]}>
          {insights.overallRisk} RISK
        </Badge>
      }
    >
      <div className="space-y-2.5">
        {lines.map((line, i) => (
          <p
            key={i}
            className={cn(
              "text-sm leading-relaxed",
              i === 0 ? "text-slate-800 font-medium" : "text-slate-600",
            )}
          >
            {line}
          </p>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          Overall operational status
        </span>
        <Badge variant={RISK_BADGE[insights.overallRisk]} className="text-xs">
          {insights.overallRisk} RISK
        </Badge>
      </div>
    </Section>
  );
}
