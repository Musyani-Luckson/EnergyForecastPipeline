import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, AlertTriangle, SkipForward } from "lucide-react";
import { usePipelineRuns } from "./hooks/usePipelineRuns";
import { useVersionReport } from "./hooks/useVersionReport";
import {
  cleanDataset, detectOutliers, runDifferencing, startForecast, getForecastStatus,
  fetchForecastSummaries, fetchForecastSeries, fetchVersionSeries,
  type ForecastSeries, type ForecastSummary as Forecast,
  type ForecastProgress as ForecastProgressData, type SelectedModel,
  type StageKey, type VersionNode, type VersionSeries,
} from "../../api/datasetsAPI";
import { HISTORY_STAGES } from "@/pages/dashboard/layers";
import { getSettings } from "@/pages/settings/settingsStore";
import {
  NEXT_STEP, SKIPPED_NOTE, STAGE_ORDER, STAGE_PURPOSE,
  isOptionalStage, nextStage, nextStepEffects,
} from "./utils";
import StageStepper from "./components/StageStepper";
import StagePurposeHeader from "./components/StagePurposeHeader";
import QualityReport from "./components/QualityReport";
import ForecastProgress, { formatOrder, type FittedEntry } from "./components/ForecastProgress";
import { QualityReportView } from "@/pages/report";
import NextStepCard from "./components/NextStepCard";
import { ForecastDashboard } from "@/pages/dashboard";
import type { TrajectoryPoint } from "./components/ReadinessScore";

/**
 * Seamless one-page pipeline workflow. Entered at a version (RAW after upload)
 * and steps forward in place: RAW → CLEANED → OUTLIERS → STATIONARY → FORECAST.
 * The reusable QualityReport is shown at every non-forecast stage.
 */
export default function DatasetWorkflow() {
  const { runId, versionId } = useParams<{ runId: string; versionId: string }>();
  const navigate = useNavigate();
  const entryId = Number(versionId);

  const { runs, loading: runsLoading } = usePipelineRuns();
  const run = useMemo(() => runs.find((r) => r.run_id === runId), [runs, runId]);
  const startNode = useMemo<VersionNode | null>(
    () => (run ? Object.values(run.pipeline).find((n) => n?.id === entryId) ?? null : null),
    [run, entryId],
  );
  const filename = run?.pipeline.RAW?.name ?? startNode?.name ?? "Dataset";

  const report = useVersionReport();
  /** The furthest stage reached — where the pipeline actually is. */
  const [activeStage, setActiveStage] = useState<StageKey | null>(null);
  /** The checkpoint being viewed; differs from `activeStage` when reviewing. */
  const [viewStage, setViewStage] = useState<StageKey | null>(null);
  const [versionIds, setVersionIds] = useState<Partial<Record<StageKey, number>>>({});
  /** Optional stages the user chose not to apply (currently only OUTLIERS). */
  const [skipped, setSkipped] = useState<StageKey[]>([]);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  /** Live grid-search progress, polled while the run executes. */
  const [progress, setProgress] = useState<ForecastProgressData | null>(null);
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  /** Candidates observed while polling, oldest first. */
  const [fitted, setFitted] = useState<FittedEntry[]>([]);
  const [forecastSeries, setForecastSeries] = useState<ForecastSeries | null>(null);
  const [stageSeries, setStageSeries] = useState<VersionSeries[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise from the entry version once the run is known.
  useEffect(() => {
    if (activeStage || !startNode) return;
    setActiveStage(startNode.stage);
    setViewStage(startNode.stage);
    setVersionIds({ [startNode.stage]: startNode.id });
  }, [activeStage, startNode]);

  // (Re)load the quality report whenever the viewed non-forecast version changes.
  // Cached reports return instantly, so reviewing an earlier stage never refetches.
  const viewedVersionId = viewStage ? versionIds[viewStage] : undefined;
  useEffect(() => {
    if (viewedVersionId && viewStage && viewStage !== "FORECAST") {
      void report.load(viewedVersionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedVersionId, viewStage]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const beginForecastPolling = (forecastId: number) => {
    setForecast(null);
    setProgress(null);
    setSelectedModel(null);
    setFitted([]);
    pollRef.current = setInterval(async () => {
      try {
        const info = await getForecastStatus(forecastId);
        // Progress first: it must keep updating on every tick, including the
        // one that reports completion.
        setProgress(info.progress);
        if (info.selected_model) setSelectedModel(info.selected_model);

        // Build the feed from successive polls. Polling samples the search
        // rather than catching every fit, so entries are appended only when
        // the candidate actually changed; a candidate is flagged as a new
        // leader when it is also the one the search is currently ranking best.
        const candidate = info.progress?.candidate ?? null;
        if (candidate) {
          const label = formatOrder(candidate);
          const best = info.progress?.best ?? null;
          const isLeader = !!best && formatOrder(best) === label;
          setFitted((prev) => {
            if (prev.length && prev[prev.length - 1].label === label) return prev;
            const entry: FittedEntry = {
              key: `${label}-${prev.length}`,
              label,
              aic: isLeader ? (best!.aic ?? null) : null,
            };
            // Bounded: the component shows the newest few, and an unbounded
            // list would grow for the whole run.
            return [...prev, entry].slice(-24);
          });
        }

        if (info.status === "FAILED") {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(info.error ?? "Forecast failed.");
          return;
        }
        if (info.status === "COMPLETED") {
          if (pollRef.current) clearInterval(pollRef.current);
          const results = await fetchForecastSummaries(runId!);
          const result = results.find((f) => f.id === info.result_id) ?? results[0] ?? null;
          setForecast(result);
          if (result) {
            // Chart data: the forecast's own series, plus every preprocessing
            // stage for the evolution overlay. Enrichment only — a failure here
            // leaves the dashboard usable.
            const stageIds = HISTORY_STAGES.map((s) => versionIds[s]).filter(
              (id): id is number => id != null,
            );
            const [own, stages] = await Promise.allSettled([
              fetchForecastSeries(result.id),
              fetchVersionSeries(stageIds),
            ]);
            if (own.status === "fulfilled") setForecastSeries(own.value);
            if (stages.status === "fulfilled") setStageSeries(stages.value);
          }
        }
      } catch {
        /* transient — keep polling */
      }
    }, 2500);
  };

  /** The checkpoint on screen — the furthest reached, unless reviewing. */
  const shownStage = viewStage ?? activeStage;
  /** The step the user is being asked to decide about next. */
  const target = shownStage ? nextStage(shownStage, skipped) : null;

  /**
   * The latest version still in real kWh. Differencing and forecasting both
   * read from this — never from STATIONARY, whose values are period-over-period
   * changes rather than absolute consumption.
   */
  const sourceVersionId =
    versionIds.OUTLIERS ?? versionIds.CLEANED ?? versionIds.RAW ?? startNode?.id;

  /** Which stage that version is — labels the history plotted on the chart. */
  const sourceStage: StageKey | undefined =
    versionIds.OUTLIERS != null
      ? "OUTLIERS"
      : versionIds.CLEANED != null
        ? "CLEANED"
        : versionIds.RAW != null
          ? "RAW"
          : startNode?.stage;

  /** Move the pipeline forward and follow it with the view. */
  const goTo = (stage: StageKey) => {
    setActiveStage(stage);
    setViewStage(stage);
  };

  /** Wraps a pipeline call with the shared busy/error handling. */
  const runStep = async (fn: () => Promise<void>) => {
    setError(null);
    setAdvancing(true);
    try {
      await fn();
    } catch {
      setError("This step could not be completed. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  /** Run the transformation that produces `target`. */
  const applyStep = (step: StageKey) => {
    if (sourceVersionId == null) return;

    void runStep(async () => {
      // Read at call time, so a settings change applies to the next step
      // without the page needing to be reloaded.
      const settings = getSettings();

      if (step === "CLEANED") {
        const { cleaned_id } = await cleanDataset(versionIds.RAW ?? sourceVersionId, {
          remove_duplicates: settings.removeDuplicates,
          enforce_daily_continuity: settings.enforceDailyContinuity,
          fill_missing_values: settings.fillMissingValues,
        });
        setVersionIds((v) => ({ ...v, CLEANED: cleaned_id }));
        goTo("CLEANED");
      } else if (step === "OUTLIERS") {
        const { cleaned_id } = await detectOutliers(versionIds.CLEANED ?? sourceVersionId, {
          method: settings.outlierMethod,
          threshold: settings.zscoreThreshold,
        });
        // Treating outliers invalidates anything derived from the untreated
        // series, so downstream versions are dropped.
        setVersionIds((v) => ({ ...v, OUTLIERS: cleaned_id, STATIONARY: undefined }));
        setSkipped((s) => s.filter((k) => k !== "OUTLIERS"));
        setForecast(null);
        goTo("OUTLIERS");
      } else if (step === "STATIONARY") {
        const d = report.report?.differencing_analysis?.recommended_d ?? 0;
        const { stationary_id } = await runDifferencing(sourceVersionId, {
          order: d,
          seasonal_order: settings.seasonalDifferencingOrder,
          seasonal_period: settings.seasonalPeriod,
        });
        setVersionIds((v) => ({ ...v, STATIONARY: stationary_id }));
        setSkipped((s) => s.filter((k) => k !== "STATIONARY"));
        setForecast(null);
        goTo("STATIONARY");
      } else if (step === "FORECAST") {
        // SARIMA differences internally, so it is fed the real-kWh series and
        // the projection comes back in kWh.
        const { forecast_id } = await startForecast(sourceVersionId);
        goTo("FORECAST");
        beginForecastPolling(forecast_id);
      }
    });
  };

  /**
   * Decline an optional transformation. No API call — the stage is simply
   * marked skipped and the next decision is offered in its place. The analysis
   * behind it stays in every report; only the transformation is declined.
   */
  const skipStep = (step: StageKey) => {
    setError(null);
    setSkipped((s) => (s.includes(step) ? s : [...s, step]));
    setVersionIds((v) => ({ ...v, [step]: undefined }));
  };

  /** Reconsider a skipped step and apply it after all. */
  const unskipStep = (step: StageKey) => {
    setSkipped((s) => s.filter((k) => k !== step));
    applyStep(step);
  };

  if (runsLoading || !activeStage) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (!startNode) {
    return (
      <div className="px-8 py-10 text-center">
        <p className="text-sm text-slate-500">Version not found.</p>
        <button onClick={() => navigate("/datasets")} className="mt-3 text-blue-600 text-sm hover:underline">
          Back to Datasets
        </button>
      </div>
    );
  }

  // Past the guards `activeStage` is non-null, so the viewed stage is too.
  const shown: StageKey = shownStage ?? activeStage;
  const activeIdx = STAGE_ORDER.indexOf(activeStage);
  const completed = STAGE_ORDER.filter(
    (s) => STAGE_ORDER.indexOf(s) < activeIdx && (versionIds[s] != null || skipped.includes(s)),
  );
  const isForecast = shown === "FORECAST";
  const reviewing = shown !== activeStage;
  const targetStep = target ?? undefined;

  // The checkpoint immediately before the one on screen — the delta baseline.
  const previousStage = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(shown))
    .filter((s) => versionIds[s] != null)
    .at(-1);
  const previousReport = report.reportFor(previousStage && versionIds[previousStage]);

  // Readiness at every checkpoint analysed so far — the pipeline's storyline.
  const trajectory = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(shown) + 1).reduce<TrajectoryPoint[]>(
    (acc, stage) => {
      const r = report.reportFor(versionIds[stage]);
      if (r) acc.push({ stage, score: r.forecasting_readiness?.score ?? 0 });
      return acc;
    },
    [],
  );

  return (
    <div className="px-8 py-7 space-y-6">
      <button
        onClick={() => navigate(`/datasets/${runId}`)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={16} /> Dataset
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight break-words">{filename}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isForecast ? "Forecast" : STAGE_PURPOSE[shown].title}
        </p>
      </div>

      <StageStepper
        active={shown}
        completed={activeStage === "FORECAST" && forecast ? [...completed, "FORECAST"] : completed}
        skipped={skipped}
        onSelect={(stage) => setViewStage(stage)}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-600/20 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {skipped.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <SkipForward size={13} className="text-slate-400" />
            Skipped steps
          </p>
          <ul className="mt-2 space-y-1.5">
            {STAGE_ORDER.filter((s) => skipped.includes(s)).map((s) => (
              <li key={s} className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-slate-600">
                  <span className="font-medium text-slate-700">{SKIPPED_NOTE[s].title}</span>{" "}
                  — {SKIPPED_NOTE[s].detail}
                </span>
                <button
                  onClick={() => unskipStep(s)}
                  disabled={advancing}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50 shrink-0"
                >
                  Apply after all
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reviewing && (
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>You’re reviewing an earlier checkpoint.</span>
          <button
            onClick={() => setViewStage(activeStage)}
            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900"
          >
            Return to current step <ArrowRight size={15} />
          </button>
        </div>
      )}

      {isForecast ? (
        forecast ? (
          // The report of the version the forecast ran on supplies the
          // historical baselines and driver evidence; the series supplies the
          // actual history and the real forecast dates.
          <ForecastDashboard
            forecast={forecast}
            report={report.reportFor(sourceVersionId)}
            series={forecastSeries}
            historyStage={sourceStage}
            stageSeries={stageSeries}
            datasetName={filename}
            onBack={() => navigate(`/datasets/${runId}`)}
          />
        ) : (
          <ForecastProgress progress={progress} selected={selectedModel} fitted={fitted} />
        )
      ) : (
        <>
          <StagePurposeHeader stage={shown} />

          {report.loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" /> <span className="text-sm">Analysing…</span>
            </div>
          ) : report.report ? (
            <>
              {/* Stage-framed checkpoint summary: deltas against the previous
                  version and the readiness trajectory across the pipeline. */}
              <QualityReport
                report={report.report}
                stage={shown}
                previous={previousReport}
                trajectory={trajectory}
              />
              {/* Full 15-section analysis of this version. */}
              <QualityReportView report={report.report} previous={previousReport} />
              {!reviewing && targetStep && (
                <NextStepCard
                  label={NEXT_STEP[targetStep].label}
                  summary={NEXT_STEP[targetStep].summary}
                  effects={nextStepEffects(targetStep, report.report)}
                  available
                  busy={advancing}
                  onContinue={() => applyStep(targetStep)}
                  continueLabel={NEXT_STEP[targetStep].action}
                  secondary={
                    isOptionalStage(targetStep)
                      ? {
                          label: "Skip this step",
                          hint: NEXT_STEP[targetStep].skipHint,
                          onClick: () => skipStep(targetStep),
                        }
                      : undefined
                  }
                />
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
