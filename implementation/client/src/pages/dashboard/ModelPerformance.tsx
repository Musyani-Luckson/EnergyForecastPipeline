import { Activity, CircleCheck, CircleX } from "lucide-react";

import type { ForecastSummary } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "@/pages/report/Section";
import { cn } from "@/lib/utils";

const num = (v: number | null | undefined, d = 2) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "-";

function Threshold({ label, met, detail }: { label: string; met: boolean | null | undefined; detail: string }) {
  if (met == null) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5",
        met ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50",
      )}
    >
      {met ? (
        <CircleCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <CircleX size={15} className="mt-0.5 shrink-0 text-rose-600" />
      )}
      <div>
        <p className={cn("text-xs font-semibold", met ? "text-emerald-800" : "text-rose-800")}>
          {label} {met ? "met" : "not met"}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

/**
 * Model configuration and, if a separate evaluation ever runs, its accuracy.
 * The operational run fits on 100% of the history and holds nothing back, so
 * these metrics are normally absent.
 */
export default function ModelPerformance({ forecast }: { forecast: ForecastSummary }) {
  const m = forecast.metrics ?? {};
  const bothMet = m.meets_rmse_threshold !== false && m.meets_mape_threshold !== false;

  return (
    <Section
      icon={Activity}
      title="Model Performance"
      description="Fitted model and any separately measured accuracy."
      action={
        <Badge variant={bothMet ? "success" : "warning"}>
          {bothMet ? "Thresholds met" : "Below threshold"}
        </Badge>
      }
    >
      <StatGrid>
        <Stat label="RMSE" value={num(m.rmse)} hint="kWh" />
        <Stat
          label="RMSE % of mean"
          value={m.rmse_pct_of_mean != null ? `${num(m.rmse_pct_of_mean)}%` : "-"}
          hint="target ≤ 15%"
        />
        <Stat label="MAE" value={num(m.mae)} hint="kWh" />
        <Stat
          label="MAPE"
          value={m.mape != null ? `${num(m.mape)}%` : "-"}
          hint="target ≤ 10%"
        />
      </StatGrid>

      <div className="grid sm:grid-cols-2 gap-2.5 mt-3">
        <Threshold
          label="RMSE threshold"
          met={m.meets_rmse_threshold}
          detail="RMSE within 15% of the forecast mean."
        />
        <Threshold
          label="MAPE threshold"
          met={m.meets_mape_threshold}
          detail="Mean absolute percentage error within 10%."
        />
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        Fitted model: SARIMA({forecast.order.join(",")})({forecast.seasonal_order.join(",")})
        {m.n_observations ? ` · ${m.n_observations} forecast points` : ""}
      </p>
      <p className="text-[11px] text-slate-400 mt-1">
        The model is fitted on 100% of the uploaded history. Accuracy metrics, when present, come
        from a separate evaluation run and never shorten the training data.
      </p>
    </Section>
  );
}
