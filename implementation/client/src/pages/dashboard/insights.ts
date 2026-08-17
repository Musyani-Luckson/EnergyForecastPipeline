import type { ForecastSeries, ForecastSummary, QualityReport } from "@/api/datasetsAPI";

/**
 * Decision-support derivations over a forecast result.
 *
 * Everything here is computed from values the API actually returns - the
 * forecast arrays, its evaluation metrics, and (optionally) the quality report
 * of the source version for historical comparison. Nothing is invented: where
 * a figure cannot be derived it is returned as null and the UI shows "N/A"
 * rather than a plausible-looking number.
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Verdict = "RELIABLE" | "USE WITH CARE" | "UNRELIABLE";

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Least-squares slope over an evenly spaced series. */
function slope(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(xs);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - mx) * (xs[i] - my);
    den += (i - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export interface DayPoint {
  /** 1-based position in the horizon. */
  step: number;
  date: Date | null;
  value: number;
  lower: number | null;
  upper: number | null;
  /** Confidence-interval width as a share of the predicted value. */
  relativeWidth: number | null;
}

export interface ForecastInsights {
  horizon: number;
  days: DayPoint[];

  /** Forecast statistics. */
  average: number;
  total: number;
  peak: DayPoint | null;
  trough: DayPoint | null;
  /** How far the peak sits above the forecast average, as a percentage. */
  peakAbovePercent: number | null;
  /** Percentage change from the first to the last day of the horizon. */
  growthPercent: number;
  /** Coefficient of variation - day-to-day dispersion. */
  volatilityPercent: number;

  /** Confidence derived from interval width; null when bounds are absent. */
  confidencePercent: number | null;
  /** How much wider the interval becomes across the horizon, as a multiple. */
  intervalWidening: number | null;

  /** Historical comparison - null unless the source report was supplied. */
  historicalAverage: number | null;
  vsHistoricalPercent: number | null;

  /** Risk ratings. */
  peakLoadRisk: RiskLevel;
  volatilityRisk: RiskLevel;
  stabilityRisk: RiskLevel;
  anomalyRisk: RiskLevel;
  overallRisk: RiskLevel;

  /** Quality inputs. */
  dataQualityPercent: number | null;
  modelAccuracy: { label: string; tone: RiskLevel } | null;
  verdict: Verdict;

  /** Whether the model used seasonal terms, and whether it differenced. */
  usesSeasonality: boolean;
  differencingOrder: number;
  seasonalPeriod: number | null;
}

const RISK_ORDER: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];
const worst = (...levels: RiskLevel[]): RiskLevel =>
  levels.reduce((a, b) => (RISK_ORDER.indexOf(b) > RISK_ORDER.indexOf(a) ? b : a), "LOW");

const band = (v: number, medium: number, high: number): RiskLevel =>
  v >= high ? "HIGH" : v >= medium ? "MEDIUM" : "LOW";

const parseDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Fallback when the series endpoint hasn't been loaded: place the horizon
 * immediately after the source dataset's last record. `forecast_dates` from
 * `/api/forecasting/series/` is authoritative and always preferred.
 */
function startDateFrom(report?: QualityReport | null): Date | null {
  const end = report?.dataset_overview?.end_date;
  if (!end) return null;
  const d = parseDate(end.replace(" ", "T"));
  if (!d) return null;
  d.setDate(d.getDate() + 1);
  return d;
}

export function buildInsights(
  forecast: ForecastSummary,
  report?: QualityReport | null,
  series?: ForecastSeries | null,
): ForecastInsights {
  const values = forecast.values ?? [];
  const lower = forecast.lower_bound ?? [];
  const upper = forecast.upper_bound ?? [];
  const realDates = series?.forecast_dates ?? [];
  const start = startDateFrom(report);

  const days: DayPoint[] = values.map((value, i) => {
    const lo = lower[i] ?? null;
    const hi = upper[i] ?? null;
    // Real forecast dates when the series is loaded; otherwise derived.
    let date: Date | null = parseDate(realDates[i]);
    if (!date && start) {
      date = new Date(start);
      date.setDate(date.getDate() + i);
    }
    return {
      step: i + 1,
      date,
      value,
      lower: lo,
      upper: hi,
      relativeWidth: lo != null && hi != null && value !== 0 ? (hi - lo) / Math.abs(value) : null,
    };
  });

  const average = mean(values);
  const total = values.reduce((a, b) => a + b, 0);

  const peak = days.length ? days.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const trough = days.length ? days.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  const peakAbovePercent =
    peak && average !== 0 ? ((peak.value - average) / average) * 100 : null;

  // Growth across the horizon, expressed from the fitted slope so a single
  // spiky day can't masquerade as a trend.
  const growthPercent =
    values.length > 1 && average !== 0
      ? ((slope(values) * (values.length - 1)) / average) * 100
      : 0;

  const volatilityPercent = average !== 0 ? (stdDev(values) / average) * 100 : 0;

  const widths = days.map((d) => d.relativeWidth).filter((w): w is number => w != null);
  // Interval width is the model's own statement of uncertainty; a ±10% band
  // reads as 90% confidence.
  const confidencePercent = widths.length
    ? Math.max(0, Math.min(100, 100 - (mean(widths) / 2) * 100))
    : null;

  const intervalWidening =
    widths.length > 1 && widths[0] > 0 ? widths[widths.length - 1] / widths[0] : null;

  const historicalAverage = report?.statistical_summary?.mean ?? null;
  const vsHistoricalPercent =
    historicalAverage != null && historicalAverage !== 0
      ? ((average - historicalAverage) / historicalAverage) * 100
      : null;

  const peakLoadRisk = band(peakAbovePercent ?? 0, 25, 50);
  const volatilityRisk = band(volatilityPercent, 15, 30);
  const stabilityRisk = band(intervalWidening != null ? (intervalWidening - 1) * 100 : 0, 50, 120);
  const anomalyRisk = band(report?.outlier_analysis?.iqr_method?.outlier_percentage ?? 0, 2, 5);

  const dataQualityPercent = report?.forecasting_readiness?.score ?? null;

  const m = forecast.metrics ?? {};
  let modelAccuracy: ForecastInsights["modelAccuracy"] = null;
  const mape = m.mape;
  if (typeof mape === "number") {
    modelAccuracy = {
      label: mape <= 10 ? "Excellent" : mape <= 20 ? "Acceptable" : "Poor",
      tone: mape <= 10 ? "LOW" : mape <= 20 ? "MEDIUM" : "HIGH",
    };
  } else if (typeof m.rmse_pct_of_mean === "number") {
    const r = m.rmse_pct_of_mean;
    modelAccuracy = {
      label: r <= 15 ? "Excellent" : r <= 25 ? "Acceptable" : "Poor",
      tone: r <= 15 ? "LOW" : r <= 25 ? "MEDIUM" : "HIGH",
    };
  }

  const overallRisk = worst(
    peakLoadRisk,
    volatilityRisk,
    stabilityRisk,
    anomalyRisk,
    modelAccuracy?.tone ?? "LOW",
  );

  const verdict: Verdict =
    overallRisk === "LOW" ? "RELIABLE" : overallRisk === "MEDIUM" ? "USE WITH CARE" : "UNRELIABLE";

  const seasonal = forecast.seasonal_order ?? [];
  const usesSeasonality = seasonal.slice(0, 3).some((n) => n > 0);

  return {
    horizon: values.length,
    days,
    average,
    total,
    peak,
    trough,
    peakAbovePercent,
    growthPercent,
    volatilityPercent,
    confidencePercent,
    intervalWidening,
    historicalAverage,
    vsHistoricalPercent,
    peakLoadRisk,
    volatilityRisk,
    stabilityRisk,
    anomalyRisk,
    overallRisk,
    dataQualityPercent,
    modelAccuracy,
    verdict,
    usesSeasonality,
    differencingOrder: forecast.order?.[1] ?? 0,
    seasonalPeriod: seasonal[3] ?? null,
  };
}
