import { Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { cn } from "@/lib/utils";
import type { ForecastInsights, RiskLevel } from "./insights";

const TONE: Record<RiskLevel, { text: string; bg: string; badge: "success" | "warning" | "destructive" }> = {
  LOW: { text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", badge: "success" },
  MEDIUM: { text: "text-amber-700", bg: "bg-amber-50 border-amber-200", badge: "warning" },
  HIGH: { text: "text-rose-700", bg: "bg-rose-50 border-rose-200", badge: "destructive" },
};

function RiskTile({ label, level, basis }: { label: string; level: RiskLevel; basis: string }) {
  const t = TONE[level];
  return (
    <div className={cn("rounded-lg border px-4 py-3", t.bg)}>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("text-lg font-bold mt-0.5", t.text)}>{level}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{basis}</p>
    </div>
  );
}

/** Managers reason in risk, not in confidence intervals. */
export default function RiskAnalysis({ insights }: { insights: ForecastInsights }) {
  const stability: RiskLevel =
    insights.stabilityRisk === "LOW" ? "LOW" : insights.stabilityRisk === "MEDIUM" ? "MEDIUM" : "HIGH";

  return (
    <Section
      icon={Gauge}
      title="Operational Risk"
      description="Where this forecast could catch you out."
      action={<Badge variant={TONE[insights.overallRisk].badge}>{insights.overallRisk}</Badge>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <RiskTile
          label="Peak load risk"
          level={insights.peakLoadRisk}
          basis={
            insights.peakAbovePercent != null
              ? `Peak ${insights.peakAbovePercent.toFixed(0)}% above average`
              : "No peak detected"
          }
        />
        <RiskTile
          label="Demand volatility"
          level={insights.volatilityRisk}
          basis={`${insights.volatilityPercent.toFixed(1)}% day-to-day variation`}
        />
        <RiskTile
          label="Prediction stability"
          level={stability}
          basis={
            insights.intervalWidening != null
              ? `Interval widens ${insights.intervalWidening.toFixed(1)}×`
              : "No interval data"
          }
        />
        <RiskTile
          label="Anomaly risk"
          level={insights.anomalyRisk}
          basis="From source-data outliers"
        />
      </div>
    </Section>
  );
}
