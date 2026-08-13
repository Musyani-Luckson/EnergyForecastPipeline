import { GitCompareArrows, Lightbulb } from "lucide-react";

import type { AdfResult, DifferencingAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section } from "./Section";
import { num } from "./format";
import { cn } from "@/lib/utils";

function OrderRow({ order, label, result }: { order: number; label: string; result: AdfResult }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        result.is_stationary ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200",
      )}
    >
      <span
        className={cn(
          "grid place-items-center size-7 rounded-md text-xs font-bold shrink-0",
          result.is_stationary ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500",
        )}
      >
        d{order}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-700">{label}</p>
        <p className="text-[11px] text-slate-500 tabular-nums">
          ADF {num(result.adf_statistic, 3)} · p {num(result.p_value, 5)}
        </p>
      </div>
      <Badge variant={result.is_stationary ? "success" : "secondary"}>
        {result.is_stationary ? "Stationary" : "Not stationary"}
      </Badge>
    </div>
  );
}

/** Section 14 — how much differencing the series needs, and why. */
export default function DifferencingAnalysis({ data }: { data: DifferencingAnalysisData }) {
  const unresolved = data.recommended_d === null;

  return (
    <Section
      icon={GitCompareArrows}
      title="Differencing Analysis"
      description="Differencing order required to achieve stationarity."
      action={
        <Badge variant={unresolved ? "destructive" : data.differencing_required ? "info" : "success"}>
          {unresolved ? "Unresolved" : `d = ${data.recommended_d}`}
        </Badge>
      }
    >
      <div className="space-y-2">
        <OrderRow order={0} label="Original series" result={data.original_series} />
        {data.first_difference && (
          <OrderRow order={1} label="First difference" result={data.first_difference} />
        )}
        {data.second_difference && (
          <OrderRow order={2} label="Second difference" result={data.second_difference} />
        )}
      </div>

      <div
        className={cn(
          "mt-3 flex items-start gap-2.5 rounded-lg border px-4 py-3",
          unresolved ? "border-rose-200 bg-rose-50/50" : "border-blue-200 bg-blue-50/50",
        )}
      >
        <Lightbulb
          size={15}
          className={cn("mt-0.5 shrink-0", unresolved ? "text-rose-600" : "text-blue-600")}
        />
        <div>
          <p
            className={cn(
              "text-[10px] uppercase tracking-wide font-semibold",
              unresolved ? "text-rose-700/80" : "text-blue-700/80",
            )}
          >
            Recommendation
          </p>
          <p className="text-sm text-slate-700 mt-0.5">{data.recommendation}</p>
        </div>
      </div>
    </Section>
  );
}
