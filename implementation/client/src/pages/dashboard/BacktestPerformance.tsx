import { CircleCheck, Cpu, Info } from "lucide-react";

import type { ForecastSummary } from "@/api/datasetsAPI";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-900 tabular-nums leading-tight mt-0.5">{value}</p>
      {unit && <p className="text-[11px] text-slate-400">{unit}</p>}
    </div>
  );
}

const num = (v: number | null | undefined, d = 2) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "-";

/**
 * What the model is, and what it was fitted on.
 *
 * Accuracy metrics are deliberately absent: the model trains on 100% of the
 * uploaded history, so there is no held-out window to score against. If a
 * separate backtesting process ever writes an evaluation, the metrics below
 * appear automatically.
 */
export default function BacktestPerformance({
  forecast,
  insights,
}: {
  forecast: ForecastSummary;
  insights?: ForecastInsights;
}) {
  const m = forecast.metrics ?? {};
  const evaluated =
    typeof m.rmse === "number" || typeof m.mae === "number" || typeof m.mape === "number";

  const [p, d, q] = forecast.order ?? [];
  const seasonal = forecast.seasonal_order ?? [];

  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Model</h2>

        <div className="grid grid-cols-4 gap-3">
          <Metric label="Order" value={`(${p ?? "-"},${d ?? "-"},${q ?? "-"})`} unit="p, d, q" />
          <Metric
            label="Seasonal"
            value={seasonal.length ? `(${seasonal.slice(0, 3).join(",")})` : "-"}
            unit={seasonal[3] ? `period ${seasonal[3]}` : undefined}
          />
          <Metric label="Horizon" value={insights ? `${insights.horizon}` : "-"} unit="days" />
          <Metric label="Trained on" value="100%" unit="of history" />
        </div>

        {evaluated && (
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
            <Metric label="MAE" value={num(m.mae)} unit="kWh" />
            <Metric label="RMSE" value={num(m.rmse)} unit="kWh" />
            <Metric label="MAPE" value={num(m.mape)} unit="%" />
            <Metric label="R²" value={num(m.r_squared, 3)} />
          </div>
        )}

        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs",
            evaluated ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600",
          )}
        >
          {evaluated ? (
            <CircleCheck size={14} className="mt-0.5 shrink-0" />
          ) : (
            <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
          )}
          <span>
            {evaluated
              ? "Accuracy measured by a separate evaluation process."
              : "No accuracy metrics: the model is fitted on every uploaded observation, so nothing is held back to score against. Accuracy would come from a separate backtesting run."}
          </span>
        </div>

        <p className="inline-flex items-start gap-1.5 text-[11px] text-slate-400 mt-2">
          <Cpu size={12} className="mt-0.5 shrink-0" />
          SARIMA({forecast.order.join(",")})({forecast.seasonal_order.join(",")})
        </p>
      </CardContent>
    </Card>
  );
}
