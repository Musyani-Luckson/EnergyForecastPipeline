/**
 * System parameters, with the values the server actually uses today as the
 * defaults.
 *
 * `wired` records whether changing a value reaches the backend. Three
 * endpoints already accept configuration - cleaning, outlier detection and
 * differencing - so those settings genuinely alter the pipeline. The SARIMA
 * engine and the accuracy thresholds are module-level constants with no
 * request field, so those are surfaced read-only rather than pretending to
 * take effect. Each entry names the file it came from.
 */

export interface AppSettings {
  // ── Data cleaning (wired: /api/preprocess/clean/) ──────────────────────────
  removeDuplicates: boolean;
  enforceDailyContinuity: boolean;
  fillMissingValues: boolean;

  // ── Outlier detection (wired: /api/preprocess/outliers/) ───────────────────
  outlierMethod: "iqr" | "zscore";
  /** Z-score cut-off; only used when the method is zscore. */
  zscoreThreshold: number;

  // ── Stationarity (wired: /api/forecasting/differencing/) ───────────────────
  seasonalPeriod: number;
  seasonalDifferencingOrder: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  removeDuplicates: true,
  enforceDailyContinuity: true,
  fillMissingValues: true,

  outlierMethod: "iqr",
  zscoreThreshold: 3,

  seasonalPeriod: 7,
  seasonalDifferencingOrder: 0,
};

export interface ReadOnlyParam {
  label: string;
  value: string;
  description: string;
  /** Where the value lives, so it can be found and changed. */
  source: string;
}

/**
 * Parameters the engine uses that no endpoint currently exposes. Shown so an
 * administrator can see the whole configuration in one place, and knows which
 * knobs need a server change rather than a form field.
 */
export const ENGINE_PARAMS: ReadOnlyParam[] = [
  {
    label: "Forecast horizon",
    value: "30 days",
    description: "Length of the projection produced by each run.",
    source: "ForecastEngine.DEFAULT_CONFIG.forecast_horizon",
  },
  {
    label: "Confidence level",
    value: "95%",
    description: "Width of the interval around each predicted value.",
    source: "ForecastEngine.DEFAULT_CONFIG.confidence",
  },
  {
    label: "Seasonal period",
    value: "Auto (7 or 30)",
    description: "Chosen per dataset from the strongest autocorrelation.",
    source: "ForecastEngine.detect_seasonal_period",
  },
  {
    label: "Training data",
    value: "100%",
    description:
      "Every uploaded observation is used to fit the model. Nothing is withheld.",
    source: "ForecastEngine.run_forecast",
  },
  {
    label: "Clip negative outputs",
    value: "Enabled",
    description: "Forecast values below zero are clipped, since consumption cannot be negative.",
    source: "ForecastEngine.DEFAULT_CONFIG.clip_negative",
  },
  {
    label: "Maximum differencing",
    value: "d ≤ 2, D ≤ 1",
    description: "Beyond this the run halts rather than over-differencing.",
    source: "DifferencingEngine.recommend",
  },
];

export const THRESHOLD_PARAMS: ReadOnlyParam[] = [
  {
    label: "Minimum records for IQR",
    value: "48",
    description: "Below this the IQR bounds aren’t considered statistically reliable.",
    source: "IQRCleaner.MIN_RECORDS",
  },
  {
    label: "Minimum records for forecasting",
    value: "365",
    description: "Coverage below this is reported as insufficient data length.",
    source: "DateCoverageAnalyzer · minimum_expected_records",
  },
  {
    label: "IQR fence multiplier",
    value: "1.5 × IQR",
    description: "Distance beyond Q1/Q3 at which a reading counts as an outlier.",
    source: "IQRCleaner.clean",
  },
  {
    label: "Imputation window",
    value: "±7 days",
    description: "Neighbourhood used for local-median replacement.",
    source: "IQRCleaner.DEFAULT_WINDOW",
  },
];
