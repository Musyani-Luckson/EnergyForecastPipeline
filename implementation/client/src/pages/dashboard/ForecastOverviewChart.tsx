import { useMemo } from "react";
import { Info } from "lucide-react";
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Scatter, Tooltip, XAxis, YAxis,
} from "recharts";

import type { ForecastSeries, QualityReport, StageKey } from "@/api/datasetsAPI";
import { Card, CardContent } from "@/components/ui/card";
import type { ForecastInsights } from "./insights";

interface ChartRow {
  date: string;
  label: string;
  historical?: number;
  forecast?: number;
  band?: [number, number];
  anomaly?: number;
}

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

/** Tooltip heading - the year matters once history and forecast span one. */
const fmtLong = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

/**
 * "Dec '23" - the apostrophe matters. A bare "Dec 23" on a daily axis reads as
 * the 23rd of December rather than the year.
 */
const monthLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${month} '${String(d.getFullYear()).slice(-2)}`;
};

/** At most this many month ticks before they're thinned to stay readable. */
const MAX_TICKS = 9;

const kwh = (v: number) => `${Math.round(v).toLocaleString()} kWh`;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Reads the row behind the hovered point rather than the payload entries.
 *
 * Recharts emits an entry for every series on every row, including the ones
 * with no value there - a historical point still yields a `forecast` entry of
 * `undefined`. Formatting those produced "NaN kWh"; taking the row directly
 * means a line only appears when that series genuinely has a value.
 */
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: ChartRow }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  const isForecast = finite(row.forecast);
  const isActual = finite(row.historical);
  // The junction row carries both so the lines meet; label it once.
  const bridged = isForecast && isActual;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold text-slate-800">
        {row.date.startsWith("step-") ? row.label : fmtLong(row.date)}
      </p>

      {isActual && (
        <p className="text-xs text-blue-900 mt-1">
          Actual: <span className="font-medium tabular-nums">{kwh(row.historical!)}</span>
        </p>
      )}
      {isForecast && !bridged && (
        <p className="text-xs text-blue-600 mt-1">
          Forecast: <span className="font-medium tabular-nums">{kwh(row.forecast!)}</span>
        </p>
      )}
      {row.band && (
        <p className="text-xs text-slate-500 mt-0.5">
          95% interval:{" "}
          <span className="font-medium tabular-nums">
            {Math.round(row.band[0]).toLocaleString()} – {Math.round(row.band[1]).toLocaleString()} kWh
          </span>
        </p>
      )}
      {finite(row.anomaly) && (
        <p className="inline-flex items-center gap-1.5 text-xs text-rose-600 mt-1">
          <span className="size-1.5 rounded-full bg-rose-500" /> Flagged as an outlier
        </p>
      )}
    </div>
  );
}

/**
 * The headline chart: actual history, the SARIMA projection, its 95% band, and
 * the anomalies already flagged in the source data.
 *
 * Anomalies use the quality report's own IQR fences, so what's marked here is
 * exactly what the preprocessing pipeline classes as an outlier - no second,
 * competing definition.
 */
/**
 * What the plotted history has had done to it. The forecast runs on the last
 * real-kWh version, so this is never RAW once cleaning has run - and never
 * STATIONARY, whose differenced values would not share an axis with a kWh
 * forecast.
 */
const HISTORY_LABEL: Partial<Record<StageKey, string>> = {
  RAW: "Historical (as uploaded)",
  CLEANED: "Historical (cleaned)",
  OUTLIERS: "Historical (cleaned + outliers treated)",
};

export default function ForecastOverviewChart({
  insights,
  series,
  report,
  historyStage,
}: {
  insights: ForecastInsights;
  series?: ForecastSeries | null;
  report?: QualityReport | null;
  /** Pipeline stage the forecast - and therefore this history - ran on. */
  historyStage?: StageKey;
}) {
  const iqr = report?.outlier_analysis?.iqr_method;

  const rows = useMemo<ChartRow[]>(() => {
    const out: ChartRow[] = [];

    for (const p of series?.historical ?? []) {
      const isAnomaly =
        iqr != null && (p.value < iqr.lower_bound || p.value > iqr.upper_bound);
      out.push({
        date: p.date,
        label: fmt(p.date),
        historical: p.value,
        anomaly: isAnomaly ? p.value : undefined,
      });
    }

    // Bridge the gap so the forecast line starts from the last actual reading
    // instead of floating detached from the history.
    const lastHistorical = out.at(-1);
    if (lastHistorical) lastHistorical.forecast = lastHistorical.historical;

    for (const d of insights.days) {
      const iso = d.date ? d.date.toISOString().slice(0, 10) : `step-${d.step}`;
      out.push({
        date: iso,
        label: d.date ? fmt(iso) : `Day ${d.step}`,
        forecast: d.value,
        band: d.lower != null && d.upper != null ? [d.lower, d.upper] : undefined,
      });
    }

    return out;
  }, [series, insights.days, iqr]);

  /**
   * One tick at the first row of each calendar month. Letting `minTickGap`
   * choose by pixel spacing puts two ticks in the same month, which then render
   * as identical labels - the axis is categorical, so spacing knows nothing
   * about the dates behind it.
   */
  const monthTicks = useMemo(() => {
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (const r of rows) {
      if (r.date.startsWith("step-")) continue;
      const month = r.date.slice(0, 7); // YYYY-MM
      if (!seen.has(month)) {
        seen.add(month);
        ticks.push(r.date);
      }
    }
    if (ticks.length <= MAX_TICKS) return ticks;
    const stride = Math.ceil(ticks.length / MAX_TICKS);
    return ticks.filter((_, i) => i % stride === 0);
  }, [rows]);

  const forecastStart = insights.days[0]?.date
    ? insights.days[0].date.toISOString().slice(0, 10)
    : null;
  const startLabel = forecastStart ? fmt(forecastStart) : null;

  const anomalyCount = rows.filter((r) => r.anomaly != null).length;

  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <h2 className="text-sm font-semibold text-slate-900">
            {insights.horizon}-Day Energy Demand Forecast
          </h2>
        </div>

        {/* Legend - explicit, because five encodings share one plot. */}
        <div className="flex items-center gap-4 flex-wrap text-[11px] text-slate-500 mb-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-blue-800 rounded" />
            {(historyStage && HISTORY_LABEL[historyStage]) ?? "Historical (Actual)"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-blue-500" /> Forecast (SARIMA)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-2.5 rounded-sm bg-blue-500/15" /> 95% confidence interval
          </span>
          {anomalyCount > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose-500" /> Anomalies ({anomalyCount})
            </span>
          )}
        </div>

        <div className="h-[340px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                // Explicit month ticks; fall back to auto spacing when the
                // series is unavailable and rows are "step-N" placeholders.
                ticks={monthTicks.length ? monthTicks : undefined}
                interval={monthTicks.length ? 0 : "preserveStartEnd"}
                minTickGap={monthTicks.length ? undefined : 48}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v: string) => (v.startsWith("step-") ? v : monthLabel(v))}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v) => Math.round(Number(v)).toLocaleString()}
                label={{
                  value: "Daily kWh",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#94a3b8" },
                }}
              />
              <Tooltip content={<ChartTooltip />} />

              {forecastStart && (
                <ReferenceLine
                  x={forecastStart}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: `Forecast start${startLabel ? ` · ${startLabel}` : ""}`,
                    position: "top",
                    fontSize: 10,
                    fill: "#64748b",
                  }}
                />
              )}

              <Area
                dataKey="band"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.15}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="historical"
                stroke="#1e40af"
                strokeWidth={1.6}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Scatter dataKey="anomaly" fill="#f43f5e" shape="circle" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {!series?.historical?.length && (
          <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-2">
            <Info size={12} className="mt-0.5 shrink-0" />
            Historical readings couldn’t be loaded, so only the forecast is plotted.
          </p>
        )}
        {series?.historical?.length && !iqr ? (
          <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-2">
            <Info size={12} className="mt-0.5 shrink-0" />
            Anomalies aren’t marked - they need the source dataset’s IQR bounds from its quality report.
          </p>
        ) : null}

        {/* Spikes in the history are the usual surprise here, so name the cause
            rather than leaving it to be inferred from the shape of the line. */}
        {historyStage === "CLEANED" && anomalyCount > 0 && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-600 mt-2">
            <Info size={12} className="mt-0.5 shrink-0" />
            Outlier treatment was skipped for this run, so the {anomalyCount} flagged reading
            {anomalyCount === 1 ? "" : "s"} remain in the history the model was fitted on.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
