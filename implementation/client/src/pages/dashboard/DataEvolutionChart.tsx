import { useCallback, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, GripVertical, Info, RotateCcw } from "lucide-react";
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis,
} from "recharts";

import type { QualityReport, VersionSeries } from "@/api/datasetsAPI";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";
import {
  ANOMALY_COLOUR, DEFAULT_LAYERS, FORECAST_BAND_FILL, LAYERS, LAYER_BY_KEY, PRESETS,
  type LayerKey,
} from "./layers";

/** Values within this many kWh are treated as unchanged by a stage. */
const CHANGE_EPSILON = 0.01;
const MAX_TICKS = 9;

/**
 * Share of the plot width given to history. The forecast is anchored to its
 * true start date and never moves - this only decides how much historical
 * context sits beside it, by changing how many past days are drawn.
 */
const DEFAULT_FOCUS = 0.78;
const MIN_FOCUS = 0.2;
const MAX_FOCUS = 0.98;
/** Never collapse history to nothing, however far the handle is dragged. */
const MIN_HISTORY_POINTS = 7;

const FOCUS_PRESETS = [
  { label: "More forecast", focus: 0.45 },
  { label: "Balanced", focus: DEFAULT_FOCUS },
  { label: "More history", focus: 0.92 },
  { label: "All history", focus: MAX_FOCUS },
] as const;

/** Plot-area insets, needed to place the drag handle over the chart. */
const AXIS_WIDTH = 56;
const MARGIN_LEFT = 4;
const MARGIN_RIGHT = 12;
const RIGHT_AXIS_WIDTH = 48;

/**
 * Visual weight per layer. With five series overlaid, equal strokes read as
 * noise - so the series the model was fitted on leads, earlier stages sit
 * behind it as context, and the differenced series stays faint because it is
 * diagnostic and shares no scale with the rest.
 */
const WEIGHT: Record<LayerKey, { width: number; opacity: number }> = {
  RAW: { width: 1, opacity: 0.45 },
  CLEANED: { width: 1.3, opacity: 0.7 },
  OUTLIERS: { width: 1.9, opacity: 1 },
  STATIONARY: { width: 1, opacity: 0.4 },
  FORECAST: { width: 2.4, opacity: 1 },
};

/** Small marker so difference dots and anomalies don't swamp the lines. */
function Dot({
  cx,
  cy,
  fill,
  r = 2.4,
}: {
  cx?: number;
  cy?: number;
  fill?: string;
  r?: number;
}) {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.9} />;
}

interface Row {
  date: string;
  RAW?: number;
  CLEANED?: number;
  OUTLIERS?: number;
  STATIONARY?: number;
  FORECAST?: number;
  band?: [number, number];
  anomaly?: number;
  /** Stages whose value differs from the stage before them, for highlighting. */
  changed?: LayerKey[];
  /** Marker values, set only on changed points so dots stay sparse. */
  changedCleaned?: number;
  changedOutliers?: number;
}

const fmtLong = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

const monthLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString("en-GB", { month: "short" })} '${String(d.getFullYear()).slice(-2)}`;
};

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const VALID_LAYERS = new Set<string>(LAYERS.map((l) => l.key));

/**
 * Stage keys are stored lowercase server-side and uppercased at the API
 * boundary. Normalising here means a casing slip shows up as a missing layer
 * rather than as lines that silently render nothing.
 */
function normaliseStage(stage: string): LayerKey | null {
  const key = String(stage).toUpperCase();
  return VALID_LAYERS.has(key) ? (key as LayerKey) : null;
}

function ChartTooltip({
  active,
  payload,
  visible,
}: {
  active?: boolean;
  payload?: { payload?: Row }[];
  visible: LayerKey[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm min-w-[190px]">
      <p className="text-xs font-semibold text-slate-800">{fmtLong(row.date)}</p>

      <div className="mt-1.5 space-y-1">
        {LAYERS.filter((l) => visible.includes(l.key)).map((l) => {
          const value = row[l.key];
          const changed = row.changed?.includes(l.key);
          return (
            <div key={l.key} className="flex items-center justify-between gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className={cn("size-1.5 rounded-full", l.swatch)} />
                {l.label}
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  changed ? "text-slate-900" : "text-slate-600",
                )}
              >
                {finite(value)
                  ? l.key === "STATIONARY"
                    ? value.toFixed(2)
                    : `${Math.round(value).toLocaleString()} kWh`
                  : "-"}
                {changed && <span className="ml-1 text-[10px] text-amber-600">changed</span>}
              </span>
            </div>
          );
        })}
      </div>

      {row.band && visible.includes("FORECAST") && (
        <p className="text-[11px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100">
          95% interval {Math.round(row.band[0]).toLocaleString()} –{" "}
          {Math.round(row.band[1]).toLocaleString()} kWh
        </p>
      )}
      {finite(row.anomaly) && (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-rose-600 mt-1">
          <span className="size-1.5 rounded-full bg-rose-500" /> Flagged as an outlier
        </p>
      )}
    </div>
  );
}

interface DataEvolutionChartProps {
  insights: ForecastInsights;
  /** Per-stage historical series, keyed by pipeline stage. */
  stageSeries: VersionSeries[];
  report?: QualityReport | null;
}

/**
 * The data-evolution timeline: every preprocessing stage overlaid on one axis,
 * with the forecast picking up exactly where the history ends.
 *
 * The point is comparison - how far the cleaned series moved from the raw one,
 * which readings outlier treatment rewrote, and what the model was finally
 * fitted on. Stages the user toggles off aren't rendered at all, so the chart
 * stays readable at five layers.
 */
export default function DataEvolutionChart({
  insights,
  stageSeries,
  report,
}: DataEvolutionChartProps) {
  const available = useMemo(() => {
    const keys = new Set<LayerKey>();
    for (const s of stageSeries) {
      const key = normaliseStage(s.stage);
      if (key && s.points.length) keys.add(key);
    }
    if (insights.horizon) keys.add("FORECAST");
    return keys;
  }, [stageSeries, insights.horizon]);

  const [visible, setVisible] = useState<LayerKey[]>(DEFAULT_LAYERS);
  /** Share of the plot width allocated to history. View-only. */
  const [focus, setFocus] = useState(DEFAULT_FOCUS);
  const [dragging, setDragging] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);

  // Only offer layers that actually have data behind them.
  const offered = LAYERS.filter((l) => available.has(l.key));
  const shown = useMemo(
    () => visible.filter((k) => available.has(k)),
    [visible, available],
  );

  const iqr = report?.outlier_analysis?.iqr_method;

  const rows = useMemo<Row[]>(() => {
    const byDate = new Map<string, Row>();

    const ensure = (date: string): Row => {
      let row = byDate.get(date);
      if (!row) {
        row = { date };
        byDate.set(date, row);
      }
      return row;
    };

    for (const s of stageSeries) {
      const key = normaliseStage(s.stage);
      if (!key) continue;
      for (const p of s.points) ensure(p.date)[key] = p.value;
    }

    for (const d of insights.days) {
      if (!d.date) continue;
      const iso = d.date.toISOString().slice(0, 10);
      const row = ensure(iso);
      row.FORECAST = d.value;
      if (d.lower != null && d.upper != null) row.band = [d.lower, d.upper];
    }

    const ordered = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

    // Mark what each stage altered, and flag anomalies against the pipeline's
    // own IQR fences so the chart agrees with the quality report.
    for (const row of ordered) {
      const changed: LayerKey[] = [];

      if (finite(row.RAW) && finite(row.CLEANED) && Math.abs(row.CLEANED - row.RAW) > CHANGE_EPSILON) {
        changed.push("CLEANED");
        row.changedCleaned = row.CLEANED;
      }
      if (
        finite(row.CLEANED) && finite(row.OUTLIERS) &&
        Math.abs(row.OUTLIERS - row.CLEANED) > CHANGE_EPSILON
      ) {
        changed.push("OUTLIERS");
        row.changedOutliers = row.OUTLIERS;
      }
      if (changed.length) row.changed = changed;

      const base = row.RAW ?? row.CLEANED;
      if (iqr && finite(base) && (base < iqr.lower_bound || base > iqr.upper_bound)) {
        row.anomaly = base;
      }
    }

    // Bridge the forecast to the last historical reading so the lines meet.
    const lastHistorical = [...ordered].reverse().find((r) => !finite(r.FORECAST));
    const firstForecastIdx = ordered.findIndex((r) => finite(r.FORECAST));
    if (lastHistorical && firstForecastIdx > 0) {
      lastHistorical.FORECAST = lastHistorical.OUTLIERS ?? lastHistorical.CLEANED ?? lastHistorical.RAW;
    }

    return ordered;
  }, [stageSeries, insights.days, iqr]);

  const forecastStart = insights.days[0]?.date?.toISOString().slice(0, 10) ?? null;

  /**
   * Split the rows at the true forecast start. The forecast half is fixed; only
   * the history half is resized, so the divider stays pinned to the real date
   * no matter where the handle sits.
   */
  const { historyRows, forecastRows } = useMemo(() => {
    const splitAt = forecastStart ? rows.findIndex((r) => r.date >= forecastStart) : -1;
    if (splitAt < 0) return { historyRows: rows, forecastRows: [] as Row[] };
    return { historyRows: rows.slice(0, splitAt), forecastRows: rows.slice(splitAt) };
  }, [rows, forecastStart]);

  /**
   * Points of history to draw so history occupies `focus` of the width.
   * With a category axis every point takes equal space, so the screen split is
   * set purely by how many points each side contributes.
   */
  const historyCount = useMemo(() => {
    const n = forecastRows.length;
    if (!n) return historyRows.length;
    const wanted = Math.round((focus * n) / (1 - focus));
    return Math.max(MIN_HISTORY_POINTS, Math.min(historyRows.length, wanted));
  }, [focus, forecastRows.length, historyRows.length]);

  const plotted = useMemo(
    () => [...historyRows.slice(-historyCount), ...forecastRows],
    [historyRows, historyCount, forecastRows],
  );

  /** Where the divider actually lands, as a fraction of the plot width. */
  const dividerFraction = useMemo(() => {
    if (!forecastRows.length || plotted.length < 2) return focus;
    return Math.min(historyCount, plotted.length - 1) / (plotted.length - 1);
  }, [historyCount, plotted.length, forecastRows.length, focus]);

  const monthTicks = useMemo(() => {
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (const r of plotted) {
      const month = r.date.slice(0, 7);
      if (!seen.has(month)) {
        seen.add(month);
        ticks.push(r.date);
      }
    }
    if (ticks.length <= MAX_TICKS) return ticks;
    const stride = Math.ceil(ticks.length / MAX_TICKS);
    return ticks.filter((_, i) => i % stride === 0);
  }, [plotted]);
  const changedCount = rows.filter((r) => r.changed?.length).length;
  const showStationaryAxis = shown.includes("STATIONARY");

  const toggle = (key: LayerKey) =>
    setVisible((v) => (v.includes(key) ? v.filter((k) => k !== key) : [...v, key]));

  /** Left inset of the plot area inside the container, in pixels. */
  const plotLeft = MARGIN_LEFT + AXIS_WIDTH;
  const plotRightInset = MARGIN_RIGHT + (showStationaryAxis ? RIGHT_AXIS_WIDTH : 0);

  const focusFromClientX = useCallback(
    (clientX: number) => {
      const box = plotRef.current?.getBoundingClientRect();
      if (!box) return null;
      const width = box.width - plotLeft - plotRightInset;
      if (width <= 0) return null;
      const ratio = (clientX - box.left - plotLeft) / width;
      return Math.max(MIN_FOCUS, Math.min(MAX_FOCUS, ratio));
    },
    [plotLeft, plotRightInset],
  );

  const onHandleMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const next = focusFromClientX(e.clientX);
    if (next != null) setFocus(next);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  /** Keyboard equivalent, so the handle isn't pointer-only. */
  const nudge = (delta: number) =>
    setFocus((f) => Math.max(MIN_FOCUS, Math.min(MAX_FOCUS, f + delta)));

  const activePreset = PRESETS.find(
    (p) =>
      p.layers.filter((l) => available.has(l)).length === shown.length &&
      p.layers.filter((l) => available.has(l)).every((l) => shown.includes(l)),
  );

  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Data Evolution & Forecast</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              How the dataset changed at each stage, and where the forecast begins.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden mr-1">
              {FOCUS_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setFocus(p.focus)}
                  title={`${p.label} - view only, the forecast is unchanged`}
                  className={cn(
                    "px-2.5 py-1.5 text-[11px] font-semibold transition",
                    Math.abs(focus - p.focus) < 0.01
                      ? "bg-slate-800 text-white"
                      : "text-slate-500 hover:bg-slate-50",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setVisible(offered.map((l) => l.key))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition"
            >
              <Eye size={12} /> Show all
            </button>
            <button
              onClick={() => setVisible([])}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition"
            >
              <EyeOff size={12} /> Hide all
            </button>
            <button
              onClick={() => setVisible(DEFAULT_LAYERS)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Layer toggles double as the legend - one control, one source of truth. */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {offered.map((l) => {
            const on = shown.includes(l.key);
            return (
              <button
                key={l.key}
                onClick={() => toggle(l.key)}
                title={l.description}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                  on ? l.chip : "border-slate-200 bg-white text-slate-400 hover:border-slate-300",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    on ? l.swatch : "bg-slate-300",
                    l.dashed && "ring-1 ring-offset-1 ring-current",
                  )}
                />
                {l.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 mr-1">Presets</span>
          {PRESETS.filter((p) => p.layers.some((l) => available.has(l))).map((p) => (
            <button
              key={p.label}
              onClick={() => setVisible(p.layers.filter((l) => available.has(l)))}
              title={p.hint}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                activePreset?.label === p.label
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="h-[460px] grid place-items-center text-sm text-slate-400">
            No layers selected - pick one above.
          </div>
        ) : (
          <div
            ref={plotRef}
            className="relative h-[460px] -mx-2 mt-3"
            onPointerMove={onHandleMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* Draggable viewport handle, pinned to the real forecast start.
                Dragging changes only how many past days are drawn - never the
                forecast, its horizon, or its origin. */}
            {forecastRows.length > 0 && shown.includes("FORECAST") && (
              <div
                className="absolute inset-y-0 z-10 pointer-events-none"
                style={{
                  left: `calc(${plotLeft}px + (100% - ${plotLeft + plotRightInset}px) * ${dividerFraction})`,
                }}
              >
                <div
                  role="slider"
                  tabIndex={0}
                  aria-label="History and forecast view balance"
                  aria-valuemin={Math.round(MIN_FOCUS * 100)}
                  aria-valuemax={Math.round(MAX_FOCUS * 100)}
                  aria-valuenow={Math.round(focus * 100)}
                  aria-valuetext={`${Math.round(focus * 100)}% history`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    setDragging(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-0.03); }
                    if (e.key === "ArrowRight") { e.preventDefault(); nudge(0.03); }
                  }}
                  title="Drag to show more history or more forecast"
                  className={cn(
                    "pointer-events-auto absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
                    "grid place-items-center h-9 w-5 rounded-full border bg-white shadow-sm",
                    "cursor-ew-resize transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400",
                    dragging
                      ? "border-violet-500 text-violet-600"
                      : "border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-500",
                  )}
                >
                  <GripVertical size={13} />
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={plotted} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  ticks={monthTicks.length ? monthTicks : undefined}
                  interval={monthTicks.length ? 0 : "preserveStartEnd"}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={monthLabel}
                />
                <YAxis
                  yAxisId="kwh"
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
                {/* Differenced values share no scale with kWh, so they get
                    their own axis rather than flattening everything else. */}
                {showStationaryAxis && (
                  <YAxis
                    yAxisId="diff"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fontSize: 11, fill: "#f59e0b" }}
                  />
                )}

                <Tooltip content={<ChartTooltip visible={shown} />} />

                {/* Tint the projected span so history and forecast are
                    distinguishable at a glance, not just at the divider. */}
                {forecastStart && shown.includes("FORECAST") && plotted.length > 0 && (
                  <ReferenceArea
                    yAxisId="kwh"
                    x1={forecastStart}
                    x2={plotted[plotted.length - 1].date}
                    fill="#7c3aed"
                    fillOpacity={0.04}
                  />
                )}

                {forecastStart && shown.includes("FORECAST") && (
                  <ReferenceLine
                    yAxisId="kwh"
                    x={forecastStart}
                    stroke="#64748b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: "Forecast starts",
                      position: "top",
                      fontSize: 10,
                      fill: "#475569",
                    }}
                  />
                )}

                {shown.includes("FORECAST") && (
                  <Area
                    yAxisId="kwh"
                    dataKey="band"
                    stroke="none"
                    fill={FORECAST_BAND_FILL}
                    fillOpacity={0.14}
                    isAnimationActive={false}
                  />
                )}

                {/* Drawn in pipeline order so the final series sits on top. */}
                {LAYERS.filter((l) => shown.includes(l.key)).map((l) => (
                  <Line
                    key={l.key}
                    yAxisId={l.ownAxis ? "diff" : "kwh"}
                    type="monotone"
                    dataKey={l.key}
                    stroke={l.colour}
                    strokeWidth={WEIGHT[l.key].width}
                    strokeOpacity={WEIGHT[l.key].opacity}
                    strokeDasharray={l.dashed ? "5 4" : undefined}
                    dot={false}
                    activeDot={{ r: 3.5, strokeWidth: 0 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}

                {/* Difference highlighting: dots only where a stage rewrote a
                    value, so the eye goes straight to what actually changed. */}
                {shown.includes("CLEANED") && shown.includes("RAW") && (
                  <Scatter
                    yAxisId="kwh"
                    dataKey="changedCleaned"
                    fill={LAYER_BY_KEY.CLEANED.colour}
                    shape={<Dot />}
                    isAnimationActive={false}
                  />
                )}
                {shown.includes("OUTLIERS") && shown.includes("CLEANED") && (
                  <Scatter
                    yAxisId="kwh"
                    dataKey="changedOutliers"
                    fill={LAYER_BY_KEY.OUTLIERS.colour}
                    shape={<Dot />}
                    isAnimationActive={false}
                  />
                )}
                {/* Anomalies only when nothing has corrected them yet -
                    otherwise 100+ red dots bury the lines they annotate. */}
                {shown.includes("RAW") && !shown.includes("OUTLIERS") && (
                  <Scatter
                    yAxisId="kwh"
                    dataKey="anomaly"
                    fill={ANOMALY_COLOUR}
                    shape={<Dot r={2.2} />}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div className="space-y-0.5">
            <p className="text-[11px] text-slate-400">
              {changedCount > 0 && shown.length > 1
                ? `Dots mark the ${changedCount.toLocaleString()} day${changedCount === 1 ? "" : "s"} preprocessing rewrote.`
                : "Toggle two or more stages to see which readings preprocessing changed."}
            </p>
            {forecastRows.length > 0 && shown.includes("FORECAST") && (
              <p className="text-[11px] text-slate-400">
                Drag the handle to balance history against forecast - showing{" "}
                <span className="font-medium text-slate-500">
                  {historyCount.toLocaleString()} of {historyRows.length.toLocaleString()}
                </span>{" "}
                past days. This changes the view only; the forecast start, horizon and values are
                fixed.
              </p>
            )}
          </div>
          {showStationaryAxis && (
            <p className="inline-flex items-start gap-1.5 text-[11px] text-amber-600">
              <Info size={12} className="mt-0.5 shrink-0" />
              Stationary is differenced - read it on the right axis, not in kWh.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
