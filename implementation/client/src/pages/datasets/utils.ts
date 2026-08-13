import type { Pipeline, PipelineRun, QualityReport, StageKey } from "../../api/datasetsAPI";

export interface StageMeta {
  key: StageKey;
  label: string;
  description: string;
}

/** The immutable version pipeline, in processing order. */
export const STAGES: StageMeta[] = [
  { key: "RAW", label: "Raw", description: "Original uploaded dataset." },
  { key: "CLEANED", label: "Cleaned", description: "Duplicates removed, calendar gaps filled." },
  { key: "OUTLIERS", label: "Outliers", description: "Anomalies detected and imputed (IQR)." },
  { key: "STATIONARY", label: "Stationary", description: "Differenced to meet SARIMA assumptions." },
  { key: "FORECAST", label: "Forecast", description: "30-day SARIMA demand forecast." },
];

export const STAGE_ORDER: StageKey[] = STAGES.map((s) => s.key);

export interface StagePurpose {
  /** Plain-language name of the checkpoint. */
  title: string;
  /** What produced this version — past tense, or the origin for RAW. */
  did: string;
  /** What this checkpoint is certifying — present tense. */
  checking: string;
}

/**
 * Why each checkpoint exists, in the facility manager's language rather than
 * the pipeline's. Rendered above every quality report.
 */
export const STAGE_PURPOSE: Record<StageKey, StagePurpose> = {
  RAW: {
    title: "Initial assessment",
    did: "Your file was uploaded exactly as supplied — nothing has been altered yet.",
    checking: "Measuring the starting condition of the data so every later change can be compared against it.",
  },
  CLEANED: {
    title: "Post-cleaning assessment",
    did: "Duplicate records were removed, calendar gaps filled, and missing readings imputed.",
    checking: "Confirming the series is now complete, continuous and free of duplicates.",
  },
  OUTLIERS: {
    title: "Outlier analysis",
    did: "Anomalous readings were detected by the IQR method and replaced using local medians.",
    checking: "Confirming extreme values no longer distort the demand pattern.",
  },
  STATIONARY: {
    title: "Stationarity assessment",
    did: "Differencing was applied so the series meets the assumptions of the forecasting model.",
    checking: "Confirming the series is stationary and certified ready for forecasting.",
  },
  FORECAST: {
    title: "Forecast",
    did: "A 30-day demand forecast was generated from the certified dataset.",
    checking: "",
  },
};

/**
 * Which report sections each stage is responsible for. Metrics a stage owns are
 * shown as its headline; the rest are demoted so that problems a *later* stage
 * exists to fix don't read as failures here.
 */
export type ReportFocus = "coverage" | "missing" | "duplicates" | "outliers" | "stationarity";

export const STAGE_FOCUS: Record<StageKey, ReportFocus[]> = {
  RAW: ["coverage"],
  CLEANED: ["missing", "duplicates", "coverage"],
  OUTLIERS: ["outliers"],
  STATIONARY: ["stationarity"],
  FORECAST: [],
};

/**
 * Transformations the user opts into rather than the pipeline imposing. Both
 * are *measured and reported* at every checkpoint regardless — it is only the
 * corrective transformation that is the user's call.
 */
export const OPTIONAL_STAGES: StageKey[] = ["OUTLIERS", "STATIONARY"];

export const isOptionalStage = (stage: StageKey): boolean => OPTIONAL_STAGES.includes(stage);

/**
 * The next stage the user is being asked to decide about, skipping over any
 * optional stages they already declined. Returns null at the end of the line.
 */
export function nextStage(from: StageKey, skipped: StageKey[]): StageKey | null {
  let i = STAGE_ORDER.indexOf(from) + 1;
  while (i < STAGE_ORDER.length && skipped.includes(STAGE_ORDER[i])) i++;
  return STAGE_ORDER[i] ?? null;
}

export interface NextStep {
  /** Action label for the button/card. */
  label: string;
  /** Wording for the confirm button. */
  action: string;
  /** One line on what the step will do to the data. */
  summary: string;
  /** Wording for the opt-out, on optional stages. */
  skipHint?: string;
}

/**
 * The action that *produces* each stage, keyed by the stage it creates. Keying
 * by target rather than by current stage is what lets an optional stage be
 * skipped without the offer sequence breaking.
 */
export const NEXT_STEP: Record<StageKey, NextStep> = {
  RAW: { label: "Upload Dataset", action: "Upload", summary: "" },
  CLEANED: {
    label: "Clean Dataset",
    action: "Clean dataset",
    summary: "Remove duplicate records, fill calendar gaps, and impute missing readings.",
  },
  OUTLIERS: {
    label: "Treat Outliers",
    action: "Apply treatment",
    summary:
      "Optional. Replace readings outside the IQR fences with local medians. Outliers are always reported — treating them is your decision.",
    skipHint: "Keep every reading as recorded and move on to the next step.",
  },
  STATIONARY: {
    label: "Apply Differencing",
    action: "Apply differencing",
    summary:
      "Optional. Difference the series to remove trend so it meets the model's stationarity assumption. The ADF test is always reported — differencing is your decision.",
    skipHint: "Forecast on the undifferenced series and let SARIMA handle the trend itself.",
  },
  FORECAST: {
    label: "Generate Forecast",
    action: "Generate forecast",
    summary: "Grid-search SARIMA orders and produce a 30-day forecast with confidence bands.",
  },
};

/**
 * What declining each optional step means for the data, so a skip is never a
 * silent omission. Both analyses still run — only the transformation is
 * declined, which is what these notes make explicit.
 */
export const SKIPPED_NOTE: Record<StageKey, { title: string; detail: string }> = {
  RAW: { title: "Upload", detail: "" },
  CLEANED: { title: "Cleaning", detail: "" },
  OUTLIERS: {
    title: "Outlier treatment",
    detail: "readings are carried through exactly as recorded, and still reported at every checkpoint.",
  },
  STATIONARY: {
    title: "Differencing",
    detail: "the series is forecast undifferenced; the ADF test is still reported at every checkpoint.",
  },
  FORECAST: { title: "Forecast", detail: "" },
};

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

/**
 * What producing `target` will actually do to *this* dataset, derived from the
 * current checkpoint's report. Turns "Clean Dataset" into "will remove 12
 * duplicate rows and fill 25 missing days".
 */
export function nextStepEffects(target: StageKey, report: QualityReport | null): string[] {
  if (!report) return [];
  const effects: string[] = [];

  if (target === "CLEANED") {
    const dupes = report.duplicates?.duplicate_rows ?? 0;
    const gaps = report.date_coverage?.missing_records ?? 0;
    const missing = report.missing_values?.total_missing ?? 0;
    if (dupes > 0) effects.push(`Remove ${plural(dupes, "duplicate row")}`);
    if (gaps > 0) effects.push(`Fill ${plural(gaps, "missing day")}`);
    if (missing > 0) effects.push(`Impute ${plural(missing, "missing reading")}`);
    if (!effects.length) effects.push("No issues found — the dataset will pass through unchanged");
  }

  if (target === "OUTLIERS") {
    const iqr = report.outlier_analysis?.iqr_method;
    const n = iqr?.outlier_count ?? 0;
    if (n > 0) {
      effects.push(`Replace ${plural(n, "reading")} outside the IQR fences with local medians`);
      effects.push(
        `Affects ${(iqr?.outlier_percentage ?? 0).toFixed(2)}% of readings — the rest are left untouched`,
      );
    } else {
      effects.push("No outliers detected — the dataset would pass through unchanged");
    }
  }

  if (target === "STATIONARY") {
    const adf = report.stationarity_analysis;
    const d = report.differencing_analysis?.recommended_d;
    if (adf?.is_stationary) {
      effects.push("Series is already stationary — differencing isn’t needed");
      effects.push(`ADF p-value ${(adf.p_value ?? 0).toFixed(4)} is already below 0.05`);
    } else if (d == null) {
      effects.push("Stationarity was not achieved even at second-order differencing");
      effects.push("Differencing here may not help — consider forecasting the series as-is");
    } else {
      effects.push(`Apply differencing of order d = ${d} to remove the trend`);
      effects.push("Values become period-over-period changes, not absolute kWh");
    }
  }

  if (target === "FORECAST") {
    effects.push("Grid-search SARIMA orders to find the best-fitting model");
    effects.push("Generate a 30-day forecast with 95% confidence intervals");
  }

  return effects;
}

/** The furthest stage that currently has a version. */
export function currentStage(pipeline: Pipeline): StageKey {
  let stage: StageKey = "RAW";
  for (const key of STAGE_ORDER) if (pipeline[key]) stage = key;
  return stage;
}

export type RunStatus = "completed" | "processing";

export function runStatus(pipeline: Pipeline): RunStatus {
  return pipeline.FORECAST ? "completed" : "processing";
}

export function datasetName(run: PipelineRun): string {
  return run.pipeline.RAW?.name ?? run.run_id.slice(0, 8);
}

export function uploadDate(run: PipelineRun): string | null {
  return run.pipeline.RAW?.created_at ?? null;
}

export function latestUpdate(run: PipelineRun): string | null {
  const dates = STAGE_ORDER
    .map((k) => run.pipeline[k]?.created_at)
    .filter((d): d is string => Boolean(d));
  return dates.length ? dates.slice().sort().at(-1)! : null;
}

export function stageLabel(key: StageKey): string {
  return STAGES.find((s) => s.key === key)?.label ?? key;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
