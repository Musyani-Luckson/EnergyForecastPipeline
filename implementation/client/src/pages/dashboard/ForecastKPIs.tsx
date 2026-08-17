import { Building2 } from "lucide-react";

import { Section, Stat } from "@/pages/report/Section";
import type { ForecastInsights } from "./insights";

const kwh = (v: number) => Math.round(v).toLocaleString();

/** The building's numbers, not the model's. */
export default function ForecastKPIs({ insights }: { insights: ForecastInsights }) {
  return (
    <Section
      icon={Building2}
      title="Building KPIs"
      description={`Across the ${insights.horizon}-day horizon.`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <Stat label="Average daily demand" value={kwh(insights.average)} hint="kWh/day" />
        <Stat
          label="Peak load"
          value={insights.peak ? kwh(insights.peak.value) : "-"}
          hint="kWh"
          tone="text-amber-600"
        />
        <Stat
          label="Peak increase"
          value={
            insights.peakAbovePercent != null
              ? `+${insights.peakAbovePercent.toFixed(0)}%`
              : "-"
          }
          hint="above average"
        />
        <Stat
          label="Forecast growth"
          value={`${insights.growthPercent >= 0 ? "+" : ""}${insights.growthPercent.toFixed(1)}%`}
          hint="across horizon"
          tone={insights.growthPercent > 0 ? "text-amber-600" : "text-emerald-600"}
        />
        <Stat
          label="Prediction confidence"
          value={
            insights.confidencePercent != null
              ? `${insights.confidencePercent.toFixed(0)}%`
              : "N/A"
          }
          hint="from interval width"
        />
      </div>
    </Section>
  );
}
