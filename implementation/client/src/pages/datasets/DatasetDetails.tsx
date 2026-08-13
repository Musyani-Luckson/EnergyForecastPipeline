import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, LineChart } from "lucide-react";
import { usePipelineRuns } from "./hooks/usePipelineRuns";
import { useRunForecast } from "./hooks/useRunForecast";
import { exportForecastReport, type VersionNode } from "../../api/datasetsAPI";
import { datasetName, runStatus } from "./utils";
import DatasetOverview from "./components/DatasetOverview";
import VersionTimeline from "./components/VersionTimeline";
import StatusBadge from "./components/StatusBadge";

type Tab = "overview" | "versions";

export default function DatasetDetails() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();

  const { runs, loading, error } = usePipelineRuns();
  const run = useMemo(() => runs.find((r) => r.run_id === runId), [runs, runId]);
  const forecast = useRunForecast(runId, Boolean(run?.pipeline.FORECAST));

  const [tab, setTab] = useState<Tab>("overview");
  const [exporting, setExporting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Loading dataset…</span>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="px-8 py-10 text-center">
        <p className="text-sm text-slate-500">{error ?? "Dataset not found."}</p>
        <button onClick={() => navigate("/datasets")} className="mt-3 text-blue-600 text-sm hover:underline">
          Back to Datasets
        </button>
      </div>
    );
  }

  // View Analysis opens the full analysis page for the version.
  const viewAnalysis = (node: VersionNode) => navigate(`/datasets/${runId}/versions/${node.id}`);

  // View Forecast opens the decision-support dashboard for the run.
  const viewForecast = () => navigate(`/datasets/${runId}/forecast`);

  const generateReport = async () => {
    if (!forecast) return;
    setExporting(true);
    try {
      const url = await exportForecastReport(forecast.id, "pdf");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* export failure is non-fatal */
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-8 py-7 space-y-6">
      <button
        onClick={() => navigate("/datasets")}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={16} /> Datasets
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight break-words">{datasetName(run)}</h1>
          <p className="font-mono text-xs text-slate-400 mt-1">{run.run_id}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge kind={runStatus(run.pipeline)} />
          {/* The forecast is the point of the pipeline, so once it exists it
              gets a top-level entry rather than living only in the timeline. */}
          {run.pipeline.FORECAST && (
            <button
              onClick={viewForecast}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold transition"
            >
              <LineChart size={15} /> View Forecast
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(["overview", "versions"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === t
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "overview" ? "Overview" : "Versions"}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <DatasetOverview run={run} />
      ) : (
        <VersionTimeline
          pipeline={run.pipeline}
          forecastResultId={forecast?.id ?? null}
          exporting={exporting}
          onViewAnalysis={viewAnalysis}
          onViewForecast={viewForecast}
          onGenerateReport={generateReport}
        />
      )}
    </div>
  );
}
