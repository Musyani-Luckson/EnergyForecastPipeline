import baseApi from "./index";

// ── Pipeline / version types (mirror the backend response shape) ──────────────

export type StageKey = "RAW" | "CLEANED" | "OUTLIERS" | "STATIONARY" | "FORECAST";

export interface VersionNode {
  id: number;
  name: string;
  stage: StageKey;
  dependency: number | null;
  metadata: Record<string, unknown>;
  instructions: Record<string, unknown>;
  created_at: string;
}

export type Pipeline = Record<StageKey, VersionNode | null>;

export interface PipelineRun {
  run_id: string;
  pipeline: Pipeline;
}

// ── Quality report (per-version analysis) ─────────────────────────────────────
// Mirrors the 15 analyzers composed by TimeSeriesQualityAnalyzer server-side.
// One interface per analyzer, so each report section can be typed independently.

export interface DatasetOverviewData {
  rows: number;
  columns: number;
  column_names: string[];
  start_date: string;
  end_date: string;
  duration_days: number;
  duration_years: number;
}

export interface DateCoverageData {
  expected_records: number;
  actual_records: number;
  missing_records: number;
  completeness_percent: number;
  minimum_required_records: number;
  passes_minimum_requirement: boolean;
}

export interface FrequencyAnalysisData {
  expected_frequency: string;
  frequency_violations: number;
  missing_timestamp_count: number;
  missing_timestamps: string[];
}

export interface MissingValuesData {
  total_missing: number;
  missing_percentage: number;
  affected_rows: number;
  affected_row_percentage: number;
  /** Per-column null counts, keyed by column name. */
  column_missing: Record<string, number>;
}

export interface DuplicatesData {
  duplicate_rows: number;
  duplicate_dates: number;
  duplicate_timestamps: string[];
}

export interface StatisticalSummaryData {
  count: number;
  mean: number;
  median: number;
  std: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  sum: number;
}

export interface DistributionAnalysisData {
  skewness: number;
  kurtosis: number;
  is_right_skewed: boolean;
  is_left_skewed: boolean;
}

export interface EnergyValueAnalysisData {
  negative_values_count: number;
  zero_values_count: number;
  has_negative_values: boolean;
  has_zero_values: boolean;
  is_energy_data_valid: boolean;
}

export interface OutlierAnalysisData {
  iqr_method: {
    q1: number;
    q3: number;
    iqr: number;
    lower_bound: number;
    upper_bound: number;
    outlier_count: number;
    outlier_percentage: number;
  };
  zscore_method: {
    outlier_count: number;
    outlier_percentage: number;
  };
}

export interface TrendAnalysisData {
  slope: number;
  intercept: number;
  r_squared: number;
  p_value: number;
  direction: "increasing" | "decreasing" | "stable";
}

export interface SeasonalityAnalysisData {
  /** Mean consumption per month, keyed by month number as a string ("1".."12"). */
  monthly_averages: Record<string, number>;
  peak_month: number;
  lowest_month: number;
  seasonal_variation_percent: number;
}

export interface AnnualBreakdownEntry {
  records: number;
  mean: number;
  min: number;
  max: number;
}

/** Keyed by year as a string ("2023"), since JSON object keys are strings. */
export type AnnualBreakdownData = Record<string, AnnualBreakdownEntry>;

export interface StationarityAnalysisData {
  adf_statistic: number;
  p_value: number;
  is_stationary: boolean;
  /** Keyed by confidence level ("1%", "5%", "10%"). */
  critical_values: Record<string, number>;
}

export interface AdfResult {
  adf_statistic: number;
  p_value: number;
  is_stationary: boolean;
}

export interface DifferencingAnalysisData {
  original_series: AdfResult;
  /** Present only when the original series was non-stationary. */
  first_difference?: AdfResult;
  /** Present only when the first difference was still non-stationary. */
  second_difference?: AdfResult;
  /** null when stationarity was not achieved even at d = 2. */
  recommended_d: number | null;
  differencing_required: boolean;
  recommendation: string;
}

export interface ForecastingReadinessData {
  score: number;
  grade: string;
  issues: string[];
  // `recommended_models` is intentionally omitted: model selection belongs to
  // the forecasting stage, not to preprocessing certification.
}

export interface QualityReport {
  dataset_overview: DatasetOverviewData;
  date_coverage: DateCoverageData;
  frequency_analysis: FrequencyAnalysisData;
  missing_values: MissingValuesData;
  duplicates: DuplicatesData;
  statistical_summary: StatisticalSummaryData;
  distribution_analysis: DistributionAnalysisData;
  energy_value_analysis: EnergyValueAnalysisData;
  outlier_analysis: OutlierAnalysisData;
  trend_analysis: TrendAnalysisData;
  seasonality_analysis: SeasonalityAnalysisData;
  annual_breakdown: AnnualBreakdownData;
  stationarity_analysis: StationarityAnalysisData;
  differencing_analysis: DifferencingAnalysisData;
  forecasting_readiness: ForecastingReadinessData;
}

// ── Forecast result (only what "Generate Report" needs) ───────────────────────

export interface ForecastMetrics {
  n_observations?: number;
  rmse?: number;
  mae?: number;
  mape?: number | null;
  /**
   * Stored on EvaluationMetric but not currently emitted by
   * `build_forecast_dto`; typed so it renders as soon as it is.
   */
  r_squared?: number | null;
  /** RMSE as a percentage of the forecast mean — the contract's headline. */
  rmse_pct_of_mean?: number | null;
  meets_rmse_threshold?: boolean | null;
  meets_mape_threshold?: boolean | null;
}

export interface ForecastSummary {
  id: number;
  dataset?: number;
  dataset_name?: string;
  run_id: string;
  order: number[];
  seasonal_order: number[];
  values?: number[];
  lower_bound?: number[];
  upper_bound?: number[];
  peaks?: { step: number; value: number }[];
  metrics: ForecastMetrics;
  created_at?: string;
}

export interface SeriesPoint {
  /** "YYYY-MM-DD". */
  date: string;
  value: number;
}

/**
 * Charting series for a forecast: the tail of the actual cleaned history plus
 * the forecast's real dates. Derived server-side on read from the source
 * version's file — this is the only endpoint exposing per-day observations.
 */
export interface ForecastSeries {
  /**
   * The complete actual history, oldest first — the same span the model was
   * fitted on — the model trains on every observation, nothing withheld.
   */
  historical: SeriesPoint[];
  /** One ISO date per forecast step, aligned with `values`. */
  forecast_dates: string[];
  data_range: { start: string | null; end: string | null };
  forecast_period: { start: string | null; end: string | null };
}

export interface ForecastStatus {
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: { phase: string } | null;
  error: string | null;
  result_id: number | null;
}

export interface UploadResult {
  /** RAW DatasetVersion id (the node threaded into preprocessing). */
  id: number;
  run_id: string;
  dataset_id: number;
}

export interface CleanResult {
  cleaned_id: number;
  run_id: string;
  applied_steps: string[];
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Upload a CSV/Excel file → creates the RAW dataset version. */
export async function uploadDataset(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await baseApi.post<Envelope<UploadResult>>("/api/datasets/upload/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
}

export interface CleaningConfig {
  remove_duplicates: boolean;
  enforce_daily_continuity: boolean;
  fill_missing_values: boolean;
}

const DEFAULT_CLEANING: CleaningConfig = {
  remove_duplicates: true,
  enforce_daily_continuity: true,
  fill_missing_values: true,
};

/** Run the cleaning stage on a version → creates the CLEANED version. */
export async function cleanDataset(
  versionId: number,
  cleaning: CleaningConfig = DEFAULT_CLEANING,
): Promise<CleanResult> {
  const res = await baseApi.post<Envelope<CleanResult>>("/api/preprocess/clean/", {
    dataset_id: versionId,
    cleaning,
  });
  return res.data.data;
}

export async function fetchPipelineRuns(): Promise<PipelineRun[]> {
  const res = await baseApi.get<Envelope<PipelineRun[]>>("/api/datasets/pipeline/");
  return res.data.data;
}

/** Quality report for a specific version (RAW/CLEANED/OUTLIERS/STATIONARY). */
export async function fetchVersionReport(versionId: number): Promise<QualityReport> {
  const res = await baseApi.post<Envelope<QualityReport>>("/api/datasets/report/", {
    dataset_id: versionId,
  });
  return res.data.data;
}

/** Forecast(s) for a run — used to enable "Generate Report" on the FORECAST stage. */
export async function fetchForecastSummaries(runId: string): Promise<ForecastSummary[]> {
  const res = await baseApi.get<Envelope<ForecastSummary[]>>("/api/forecasting/results/", {
    params: { run_id: runId },
  });
  return res.data.data;
}

/** Cross-dataset totals for the landing dashboard. */
export interface DashboardOverview {
  datasets: {
    total: number;
    /** Version counts keyed by uppercase stage. */
    versions_by_stage: Partial<Record<StageKey, number>>;
    runs: number;
  };
  forecasts: {
    total: number;
    /** Five most recent, newest first. */
    recent: ForecastSummary[];
  };
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await baseApi.get<Envelope<DashboardOverview>>("/api/dashboard/overview/");
  return res.data.data;
}

export interface VersionSeries {
  dataset_id: number;
  stage: StageKey;
  /** Per-day observations, oldest first. Differenced for STATIONARY. */
  points: SeriesPoint[];
}

/**
 * Per-day observations for one or more versions, so the pipeline stages can be
 * overlaid on one chart. STATIONARY values are differenced rather than kWh —
 * check `stage` before putting a series on a shared axis.
 */
export async function fetchVersionSeries(versionIds: number[]): Promise<VersionSeries[]> {
  if (!versionIds.length) return [];
  const res = await baseApi.get<Envelope<VersionSeries[]>>("/api/datasets/series/", {
    params: { dataset_ids: versionIds.join(",") },
  });
  return res.data.data;
}

/** Historical series + real forecast dates for a forecast's chart. */
export async function fetchForecastSeries(forecastId: number): Promise<ForecastSeries> {
  const res = await baseApi.get<Envelope<ForecastSeries>>("/api/forecasting/series/", {
    params: { forecast_id: forecastId },
  });
  return res.data.data;
}

/** Export a forecast report (PDF/CSV); returns the downloadable URL. */
export async function exportForecastReport(
  resultId: number,
  format: "pdf" | "csv",
): Promise<string> {
  const res = await baseApi.get<Envelope<{ report_url: string }>>("/api/reports/export/", {
    params: { result_id: resultId, format },
  });
  return res.data.data.report_url;
}

// ── Pipeline step actions (used by the seamless workflow) ─────────────────────

export interface OutlierConfig {
  method: "iqr" | "zscore";
  /** Only read when the method is zscore. */
  threshold?: number;
}

/** Outlier stage: detection + imputation → creates the OUTLIERS version. */
export async function detectOutliers(
  versionId: number,
  outlier: OutlierConfig = { method: "iqr" },
): Promise<{ cleaned_id: number; run_id: string }> {
  const res = await baseApi.post<Envelope<{ cleaned_id: number; run_id: string }>>(
    "/api/preprocess/outliers/",
    { dataset_id: versionId, outlier },
  );
  return res.data.data;
}

export interface DifferencingConfig {
  /** Non-seasonal order, normally taken from the report's recommendation. */
  order: number;
  seasonal_order?: number;
  seasonal_period?: number;
}

/** Stationarity stage: differencing → STATIONARY version. */
export async function runDifferencing(
  versionId: number,
  config: DifferencingConfig,
): Promise<{ stationary_id: number; run_id: string }> {
  const res = await baseApi.post<Envelope<{ stationary_id: number; run_id: string }>>(
    "/api/forecasting/differencing/",
    {
      dataset_id: versionId,
      order: config.order,
      seasonal_order: config.seasonal_order ?? 0,
      seasonal_period: config.seasonal_period ?? 7,
    },
  );
  return res.data.data;
}

/** Forecast stage: start a background SARIMA run. Returns the run/job id. */
export async function startForecast(
  versionId: number,
): Promise<{ forecast_id: number; run_id: string; status: string }> {
  const res = await baseApi.post<Envelope<{ forecast_id: number; run_id: string; status: string }>>(
    "/api/forecasting/run/",
    { dataset_id: versionId, background: true },
  );
  return res.data.data;
}

/** Poll a forecast run's status. */
export async function getForecastStatus(forecastId: number): Promise<ForecastStatus> {
  const res = await baseApi.get<Envelope<ForecastStatus>>("/api/forecasting/status/", {
    params: { forecast_id: forecastId },
  });
  return res.data.data;
}
