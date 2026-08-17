import { Compass, Info } from "lucide-react";

import type { ForecastSummary, QualityReport } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";

interface Driver {
  label: string;
  /** 0–5 strength rating. */
  stars: number;
  evidence: string;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="tracking-widest text-amber-500 text-sm" aria-label={`${n} out of 5`}>
      {"★".repeat(n)}
      <span className="text-slate-200">{"★".repeat(5 - n)}</span>
    </span>
  );
}

const rate = (v: number, thresholds: [number, number, number, number]): number =>
  v >= thresholds[3] ? 5 : v >= thresholds[2] ? 4 : v >= thresholds[1] ? 3 : v >= thresholds[0] ? 2 : 1;

/**
 * Why the model produced this forecast, rated from measurable evidence.
 *
 * These are strength ratings, not variance decomposition - SARIMA doesn't
 * expose additive trend/seasonality contributions, so percentage splits would
 * be invented. Each rating names the figure it comes from.
 */
export default function ForecastDrivers({
  forecast,
  insights,
  report,
}: {
  forecast: ForecastSummary;
  insights: ForecastInsights;
  report?: QualityReport | null;
}) {
  const drivers: Driver[] = [];

  const seasonalVariation = report?.seasonality_analysis?.seasonal_variation_percent;
  if (insights.usesSeasonality || seasonalVariation != null) {
    drivers.push({
      label: "Seasonality",
      stars: insights.usesSeasonality
        ? rate(seasonalVariation ?? 20, [5, 10, 20, 35])
        : 1,
      evidence: insights.usesSeasonality
        ? `Seasonal terms fitted${insights.seasonalPeriod ? ` on a ${insights.seasonalPeriod}-day cycle` : ""}${seasonalVariation != null ? `; ${seasonalVariation.toFixed(1)}% seasonal variation in history` : ""}.`
        : "No seasonal terms in the fitted model.",
    });
  }

  const r2 = report?.trend_analysis?.r_squared;
  if (r2 != null) {
    drivers.push({
      label: "Trend",
      stars: rate(r2, [0.05, 0.2, 0.4, 0.6]),
      evidence: `Historical regression explains ${(r2 * 100).toFixed(1)}% of variation (R² ${r2.toFixed(3)}).`,
    });
  }

  const mape = forecast.metrics?.mape;
  if (typeof mape === "number") {
    drivers.push({
      label: "Historical similarity",
      stars: rate(100 - mape, [60, 75, 85, 92]),
      evidence: `Separately measured error of ${mape.toFixed(2)}% MAPE.`,
    });
  }

  if (insights.confidencePercent != null) {
    drivers.push({
      label: "Confidence",
      stars: rate(insights.confidencePercent, [55, 70, 85, 93]),
      evidence: `Average interval width implies ${insights.confidencePercent.toFixed(0)}% confidence.`,
    });
  }

  return (
    <Section
      icon={Compass}
      title="Why This Forecast?"
      description="The evidence behind the projection."
      action={
        <Badge variant="secondary">
          SARIMA({forecast.order.join(",")})({forecast.seasonal_order.join(",")})
        </Badge>
      }
    >
      <div className="space-y-3">
        {drivers.map((d) => (
          <div key={d.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-700">{d.label}</span>
              <Stars n={d.stars} />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{d.evidence}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        <p className="text-xs text-slate-600">
          Differencing applied:{" "}
          <span className={cn("font-semibold", insights.differencingOrder > 0 ? "text-amber-600" : "text-emerald-600")}>
            {insights.differencingOrder > 0 ? `d = ${insights.differencingOrder}` : "none"}
          </span>
        </p>
        {report && (
          <p className="text-xs text-slate-600">
            Source series:{" "}
            <span
              className={cn(
                "font-semibold",
                report.stationarity_analysis.is_stationary ? "text-emerald-600" : "text-amber-600",
              )}
            >
              {report.stationarity_analysis.is_stationary ? "stationary" : "non-stationary"}
            </span>
          </p>
        )}
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-3">
        <Info size={12} className="mt-0.5 shrink-0" />
        Strength ratings, not a variance decomposition - SARIMA doesn’t expose additive
        trend/seasonality shares, so percentage splits aren’t derivable.
      </p>
    </Section>
  );
}
