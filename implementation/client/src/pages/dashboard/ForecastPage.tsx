import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

import {
  fetchForecastSeries, fetchForecastSummaries, fetchVersionReport, fetchVersionSeries,
  type ForecastSeries, type ForecastSummary, type QualityReport, type StageKey,
  type VersionSeries,
} from "@/api/datasetsAPI";
import { HISTORY_STAGES } from "./layers";
import { usePipelineRuns } from "@/pages/datasets/hooks/usePipelineRuns";
import { datasetName } from "@/pages/datasets/utils";
import ForecastDashboard from "./ForecastDashboard";

/**
 * Standalone forecast dashboard for a completed run, reached from the dataset's
 * version timeline. Unlike the in-workflow view it holds no pipeline state - it
 * reloads the forecast and its source report from the run alone, so the page
 * survives a refresh and can be linked to directly.
 */
export default function ForecastPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const { runs, loading: runsLoading, error: runsError } = usePipelineRuns();
  const run = useMemo(() => runs.find((r) => r.run_id === runId), [runs, runId]);

  const [forecast, setForecast] = useState<ForecastSummary | null>(null);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [series, setSeries] = useState<ForecastSeries | null>(null);
  const [stageSeries, setStageSeries] = useState<VersionSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * The version the forecast was run on - the last one still in real kWh.
   * STATIONARY is excluded: its values are period-over-period changes, so its
   * statistics would give the dashboard the wrong historical baseline.
   */
  const source = useMemo(() => {
    if (!run) return { id: null as number | null, stage: undefined as StageKey | undefined };
    if (run.pipeline.OUTLIERS) return { id: run.pipeline.OUTLIERS.id, stage: "OUTLIERS" as const };
    if (run.pipeline.CLEANED) return { id: run.pipeline.CLEANED.id, stage: "CLEANED" as const };
    if (run.pipeline.RAW) return { id: run.pipeline.RAW.id, stage: "RAW" as const };
    return { id: null, stage: undefined };
  }, [run]);
  const sourceVersionId = source.id;

  useEffect(() => {
    // Wait for the run before fetching, but don't guard with a ref: under
    // StrictMode the second mount would skip the fetch while the first mount's
    // result is discarded as stale, leaving `loading` stuck on forever.
    if (!runId || !run) return;

    let active = true;

    (async () => {
      // Reset inside the async body rather than the effect body - a synchronous
      // setState here would trigger the cascading-render lint rule.
      setLoading(true);
      setError(null);
      try {
        const results = await fetchForecastSummaries(runId);
        if (!active) return;

        // ResultListView orders by -created_at, so the newest is first.
        const latest = results[0] ?? null;
        if (!latest) {
          setError("No forecast has been generated for this dataset yet.");
          return;
        }
        setForecast(latest);

        // The series (actual history + real forecast dates) and the source
        // report (baselines, IQR bounds, driver evidence) are both enrichment:
        // the dashboard degrades rather than fails if either is unavailable.
        // Every preprocessing stage that produced a version, for the overlay.
        const stageIds = HISTORY_STAGES.map((s) => run.pipeline[s]?.id).filter(
          (id): id is number => id != null,
        );

        const [seriesResult, reportResult, stagesResult] = await Promise.allSettled([
          fetchForecastSeries(latest.id),
          sourceVersionId != null
            ? fetchVersionReport(sourceVersionId)
            : Promise.reject(new Error("no source version")),
          fetchVersionSeries(stageIds),
        ]);
        if (!active) return;

        if (seriesResult.status === "fulfilled") setSeries(seriesResult.value);
        if (reportResult.status === "fulfilled") setReport(reportResult.value);
        if (stagesResult.status === "fulfilled") setStageSeries(stagesResult.value);
      } catch {
        if (active) setError("Could not load the forecast for this dataset.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [runId, run, sourceVersionId]);

  const Spinner = (
    <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
      <Loader2 size={22} className="animate-spin text-blue-600" />
      <p className="text-sm font-medium text-slate-600">Loading saved forecast…</p>
      {/* Grid search takes minutes, so it matters that the user knows this page
          only reads an existing result and never starts a new run. */}
      <p className="text-xs text-slate-400 max-w-[320px]">
        Reading the stored result for this dataset. No new forecast is being run.
      </p>
    </div>
  );

  if (runsLoading) return Spinner;

  // Resolve the run before the fetch state: when the run doesn't exist the
  // effect never runs, so `loading` stays true and a spinner-first order would
  // hang here instead of reporting the missing dataset.
  if (runsError || !run) {
    return (
      <div className="px-8 py-10 text-center">
        <p className="text-sm text-slate-500">{runsError ?? "Dataset not found."}</p>
        <button
          onClick={() => navigate("/datasets")}
          className="mt-3 text-blue-600 text-sm hover:underline"
        >
          Back to Datasets
        </button>
      </div>
    );
  }

  if (loading && !error) return Spinner;

  if (error || !forecast) {
    return (
      <div className="px-8 py-7 space-y-6">
        <button
          onClick={() => navigate(`/datasets/${runId}`)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Dataset
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight break-words">
            {datasetName(run)}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Forecast</p>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 ring-1 ring-inset ring-amber-600/20 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error ?? "No forecast is available for this dataset."}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-7">
      <ForecastDashboard
        forecast={forecast}
        report={report}
        series={series}
        historyStage={source.stage}
        stageSeries={stageSeries}
        datasetName={datasetName(run)}
        onBack={() => navigate(`/datasets/${runId}`)}
      />
    </div>
  );
}
