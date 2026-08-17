import { Activity } from "lucide-react";

import type { StationarityAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "./Section";
import { num } from "./format";
import { cn } from "@/lib/utils";

/** Section 13 - the Augmented Dickey-Fuller test for a unit root. */
export default function StationarityAnalysis({ data }: { data: StationarityAnalysisData }) {
  const levels = Object.entries(data.critical_values).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0]),
  );

  return (
    <Section
      icon={Activity}
      title="Stationarity Analysis"
      description="Augmented Dickey-Fuller test for a stable mean and variance."
      action={
        <Badge variant={data.is_stationary ? "success" : "warning"}>
          {data.is_stationary ? "Stationary" : "Non-stationary"}
        </Badge>
      }
    >
      <StatGrid cols={2}>
        <Stat label="ADF statistic" value={num(data.adf_statistic, 4)} />
        <Stat
          label="p-value"
          value={num(data.p_value, 5)}
          hint={data.p_value < 0.05 ? "below 0.05 - reject unit root" : "above 0.05 - unit root likely"}
          tone={data.is_stationary ? "text-emerald-600" : "text-amber-600"}
        />
      </StatGrid>

      <div className="mt-3 rounded-lg border border-slate-200 px-4 py-3">
        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">Critical values</p>
        <div className="grid grid-cols-3 gap-3">
          {levels.map(([level, value]) => {
            // A statistic more negative than the critical value rejects the unit root.
            const beats = data.adf_statistic < value;
            return (
              <div key={level}>
                <p className="text-[11px] text-slate-500">{level}</p>
                <p className="text-sm font-medium tabular-nums text-slate-800">{num(value, 3)}</p>
                <p
                  className={cn(
                    "text-[10px] font-medium mt-0.5",
                    beats ? "text-emerald-600" : "text-slate-400",
                  )}
                >
                  {beats ? "rejected" : "not rejected"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        {data.is_stationary
          ? "The series has a stable mean and variance over time, satisfying the model's assumptions."
          : "The series drifts over time, so differencing is required before forecasting."}
      </p>
    </Section>
  );
}
