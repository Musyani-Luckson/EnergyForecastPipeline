import type { PipelineRun, StageKey } from "@/api/datasetsAPI";
import { STAGE_ORDER, currentStage, datasetName, latestUpdate, uploadDate } from "@/pages/datasets/utils";

/**
 * Cross-dataset state, derived from the pipeline runs.
 *
 * The pipeline endpoint is the authority on where each dataset actually got to
 * - the overview endpoint's `versions_by_stage` counts *versions*, so a run
 * that reached OUTLIERS contributes to three stage buckets at once and can't
 * answer "how many datasets are stuck before forecasting".
 */

export interface RunSummary {
  runId: string;
  name: string;
  stage: StageKey;
  complete: boolean;
  uploadedAt: string | null;
  updatedAt: string | null;
  /** Stages still to run before a forecast exists. */
  remaining: number;
}

export interface Portfolio {
  runs: RunSummary[];
  total: number;
  completed: number;
  inProgress: number;
  /** Runs by the furthest stage they reached. */
  byStage: Record<StageKey, number>;
  /** Reached a checkpoint but never forecast - the actionable backlog. */
  stalled: RunSummary[];
  /** Completion as a percentage of all runs. */
  completionPercent: number;
}

export function buildPortfolio(runs: PipelineRun[]): Portfolio {
  const byStage = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<StageKey, number>;

  const summaries: RunSummary[] = runs.map((run) => {
    const stage = currentStage(run.pipeline);
    const complete = run.pipeline.FORECAST != null;
    byStage[stage] += 1;

    return {
      runId: run.run_id,
      name: datasetName(run),
      stage,
      complete,
      uploadedAt: uploadDate(run),
      updatedAt: latestUpdate(run),
      remaining: Math.max(0, STAGE_ORDER.length - 1 - STAGE_ORDER.indexOf(stage)),
    };
  });

  const completed = summaries.filter((r) => r.complete).length;

  // Oldest first: the longest-waiting dataset is the one to pick up next.
  const stalled = summaries
    .filter((r) => !r.complete)
    .sort((a, b) => (a.updatedAt ?? "").localeCompare(b.updatedAt ?? ""));

  return {
    runs: summaries,
    total: summaries.length,
    completed,
    inProgress: summaries.length - completed,
    byStage,
    stalled,
    completionPercent: summaries.length ? (completed / summaries.length) * 100 : 0,
  };
}

/** The action that would move a stalled run forward. */
export function nextActionFor(stage: StageKey): string {
  switch (stage) {
    case "RAW":
      return "Clean the dataset";
    case "CLEANED":
      return "Treat outliers, or skip to differencing";
    case "OUTLIERS":
      return "Apply differencing, or forecast directly";
    case "STATIONARY":
      return "Generate the forecast";
    default:
      return "Review the forecast";
  }
}

/** "3 days ago" - relative time reads better than a date in an activity list. */
export function relativeTime(iso: string | null): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";

  const fmt = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  const ago = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
    fmt.format(-Math.round(value), unit);

  const MINUTE = 60;
  const HOUR = 3_600;
  const DAY = 86_400;
  const WEEK = 604_800;
  const MONTH = 2_629_800; // average, good enough for an activity list
  const YEAR = 31_557_600;

  if (seconds < HOUR) return ago(seconds / MINUTE, "minute");
  if (seconds < DAY) return ago(seconds / HOUR, "hour");
  if (seconds < WEEK) return ago(seconds / DAY, "day");
  if (seconds < MONTH) return ago(seconds / WEEK, "week");
  if (seconds < YEAR) return ago(seconds / MONTH, "month");
  return ago(seconds / YEAR, "year");
}
