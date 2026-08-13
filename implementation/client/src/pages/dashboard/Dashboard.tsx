import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, Plus } from "lucide-react";

import { fetchDashboardOverview, type DashboardOverview } from "@/api/datasetsAPI";
import { usePipelineRuns } from "@/pages/datasets/hooks/usePipelineRuns";
import { buildPortfolio } from "./portfolio";
import PortfolioKPIs from "./PortfolioKPIs";
import PipelineFunnel from "./PipelineFunnel";
import NeedsAttention from "./NeedsAttention";
import RecentForecasts from "./RecentForecasts";
import {
  CompletionRing, DemandComparison, StageDistribution, UploadActivity,
} from "./PortfolioCharts";

/**
 * Landing view: the state of every dataset in the system at a glance.
 *
 * Totals come from the dashboard overview endpoint, but per-dataset state is
 * derived from the pipeline runs — `versions_by_stage` counts versions, so a
 * run that reached OUTLIERS lands in three buckets and can't answer "how many
 * datasets are still waiting".
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { runs, loading: runsLoading, error: runsError } = usePipelineRuns();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setOverviewLoading(true);
      try {
        const data = await fetchDashboardOverview();
        if (active) setOverview(data);
      } catch {
        // Totals are supplementary — the portfolio derives from the runs.
        if (active) setOverview(null);
      } finally {
        if (active) setOverviewLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const portfolio = useMemo(() => buildPortfolio(runs), [runs]);

  if (runsLoading || overviewLoading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading overview…</span>
      </div>
    );
  }

  const empty = portfolio.total === 0;

  return (
    <div className="px-8 py-7 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {empty
              ? "No datasets yet — upload one to get started."
              : `${portfolio.total} dataset${portfolio.total === 1 ? "" : "s"} in the system, ${portfolio.completed} forecast.`}
          </p>
        </div>
        <button
          onClick={() => navigate("/datasets")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold transition"
        >
          <Plus size={15} /> New Dataset
        </button>
      </div>

      {runsError && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 ring-1 ring-inset ring-rose-600/20 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {runsError}
        </div>
      )}

      {empty ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">Nothing to show yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Upload an energy consumption file to run it through cleaning, outlier treatment and
            stationarity checks, then generate a 30-day demand forecast.
          </p>
          <button
            onClick={() => navigate("/datasets")}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-sm font-semibold transition"
          >
            <Plus size={15} /> Upload a dataset
          </button>
        </div>
      ) : (
        <>
          <PortfolioKPIs
            portfolio={portfolio}
            totalDatasets={overview?.datasets?.total}
            totalForecasts={overview?.forecasts?.total}
          />

          {/* Completion is the headline, so it leads; the funnel and donut
              answer "where is everything" from two angles beside it. */}
          <div className="grid lg:grid-cols-[280px_1fr_1fr] gap-4 items-start">
            <CompletionRing portfolio={portfolio} />
            <PipelineFunnel portfolio={portfolio} />
            <StageDistribution portfolio={portfolio} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 items-start">
            <UploadActivity portfolio={portfolio} />
            <NeedsAttention portfolio={portfolio} />
          </div>

          <DemandComparison forecasts={overview?.forecasts?.recent ?? []} />

          <RecentForecasts forecasts={overview?.forecasts?.recent ?? []} />
        </>
      )}
    </div>
  );
}
