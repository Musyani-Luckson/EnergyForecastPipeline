import { Clock } from "lucide-react";
import type { QualityReport as Report, StageKey } from "../../../api/datasetsAPI";
import { STAGE_FOCUS, stageLabel, type ReportFocus } from "../utils";
import ReadinessScore, { type TrajectoryPoint } from "./ReadinessScore";
import MetricTile from "./MetricTile";

const num = (v: number | undefined | null, d = 2): string =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—";

/**
 * Notes that an issue is expected here because a later stage owns it — so an
 * unresolved value at an early checkpoint doesn't read as a failure.
 */
function HandledLater({ stage }: { stage: StageKey }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
      <Clock size={11} /> handled at {stageLabel(stage)}
    </span>
  );
}

interface QualityReportProps {
  report: Report;
  /** The stage this report certifies — drives which metrics are emphasised. */
  stage: StageKey;
  /** The previous checkpoint's report, for change chips. */
  previous?: Report | null;
  trajectory?: TrajectoryPoint[];
}

/**
 * The checkpoint strip shown above the full quality report: what changed since
 * the previous stage, and how readiness has climbed across the pipeline. The
 * detailed per-section analysis lives in `@/pages/report`.
 */
export default function QualityReport({
  report,
  stage,
  previous,
  trajectory = [],
}: QualityReportProps) {
  const iqr = report.outlier_analysis.iqr_method;
  const adf = report.stationarity_analysis;

  const prevIqr = previous?.outlier_analysis?.iqr_method;
  const focus = STAGE_FOCUS[stage];
  const owns = (f: ReportFocus) => focus.includes(f);

  // A metric is only reassuring once the stage that owns it has run.
  const outliersPending = stage === "RAW" || stage === "CLEANED";
  const stationarityPending = stage !== "STATIONARY";

  return (
    <div className="space-y-4">
      <ReadinessScore
        compact
        score={report.forecasting_readiness?.score ?? 0}
        grade={report.forecasting_readiness?.grade ?? "—"}
        trajectory={trajectory}
        isBaseline={stage === "RAW"}
      />

      {/* Headline metrics — focused tiles belong to this stage. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricTile
          label="Rows"
          value={report.dataset_overview.rows.toLocaleString()}
          current={report.dataset_overview.rows}
          previous={previous?.dataset_overview?.rows}
          better="neutral"
          focused={owns("coverage")}
        />
        <MetricTile
          label="Completeness"
          value={`${num(report.date_coverage.completeness_percent, 1)}%`}
          current={report.date_coverage.completeness_percent}
          previous={previous?.date_coverage?.completeness_percent}
          better="higher"
          focused={owns("coverage")}
        />
        <MetricTile
          label="Missing values"
          value={report.missing_values.total_missing.toLocaleString()}
          current={report.missing_values.total_missing}
          previous={previous?.missing_values?.total_missing}
          better="lower"
          focused={owns("missing")}
        />
        <MetricTile
          label="Duplicate rows"
          value={report.duplicates.duplicate_rows.toLocaleString()}
          current={report.duplicates.duplicate_rows}
          previous={previous?.duplicates?.duplicate_rows}
          better="lower"
          focused={owns("duplicates")}
        />
        <MetricTile
          label="Outliers"
          value={iqr.outlier_count.toLocaleString()}
          current={iqr.outlier_count}
          previous={prevIqr?.outlier_count}
          better="lower"
          focused={owns("outliers")}
        />
        <MetricTile
          label="Stationary"
          value={adf.is_stationary ? "Yes" : "No"}
          tone={
            adf.is_stationary
              ? "text-emerald-600"
              : stationarityPending
                ? "text-slate-400"
                : "text-amber-600"
          }
          reserveDelta
          focused={owns("stationarity")}
        />
      </div>

      {/* Deferred-issue notices, so early checkpoints don't look like failures. */}
      {(outliersPending || stationarityPending) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
          {outliersPending && iqr.outlier_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              {iqr.outlier_count.toLocaleString()} outliers detected —{" "}
              <HandledLater stage="OUTLIERS" />
            </span>
          )}
          {stationarityPending && !adf.is_stationary && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              Series is not yet stationary — <HandledLater stage="STATIONARY" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
