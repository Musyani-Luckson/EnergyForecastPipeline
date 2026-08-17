import { useMemo, useState, type ReactNode } from "react";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

import {
  exportForecastReport,
  type ForecastSeries, type ForecastSummary, type QualityReport, type StageKey,
  type VersionSeries,
} from "@/api/datasetsAPI";
import DataEvolutionChart from "./DataEvolutionChart";
import { buildInsights } from "./insights";
import ForecastResultsHeader from "./ForecastResultsHeader";
import ForecastOverviewChart from "./ForecastOverviewChart";
import ForecastSummaryCard from "./ForecastSummaryCard";
import BacktestPerformance from "./BacktestPerformance";
import ForecastHealth from "./ForecastHealth";
import EnergyIntelligence from "./EnergyIntelligence";
import KeyInsights from "./KeyInsights";
import ActionCentre from "./ActionCentre";
import SmartAlerts from "./SmartAlerts";
import RiskAnalysis from "./RiskAnalysis";
import ForecastKPIs from "./ForecastKPIs";
import { PeakEventPair } from "./PeakEvent";
import OperationalCalendar from "./OperationalCalendar";
import ConfidenceTimeline from "./ConfidenceTimeline";
import CompareWithHistory from "./CompareWithHistory";
import CostImpact from "./CostImpact";
import ForecastDrivers from "./ForecastDrivers";
import ModelPerformance from "./ModelPerformance";
import DailyForecastTable from "./DailyForecastTable";

const TABS = ["Forecast Overview", "Decisions", "Forecast Table", "Diagnostics", "Model Details", "Export"] as const;
type Tab = (typeof TABS)[number];

function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 pt-2">
      {children}
    </h2>
  );
}

interface ForecastDashboardProps {
  forecast: ForecastSummary;
  /** Quality report of the version the forecast ran on. */
  report?: QualityReport | null;
  /** Historical series and real forecast dates from /api/forecasting/series/. */
  series?: ForecastSeries | null;
  /** Pipeline stage the forecast ran on - labels the plotted history. */
  historyStage?: StageKey;
  /** Per-stage historical series, for the data-evolution overlay. */
  stageSeries?: VersionSeries[];
  datasetName?: string;
  onBack?: () => void;
}

/**
 * Forecast results view.
 *
 * The Overview tab is the analyst's read - chart, summary figures, backtest.
 * Decisions is the operational read: what to do, and what to watch. Both are
 * one click apart so neither audience has to scroll past the other's material.
 */
export default function ForecastDashboard({
  forecast,
  report,
  series,
  historyStage,
  stageSeries,
  datasetName,
  onBack,
}: ForecastDashboardProps) {
  const insights = useMemo(
    () => buildInsights(forecast, report, series),
    [forecast, report, series],
  );
  const [tab, setTab] = useState<Tab>("Forecast Overview");
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const handleExport = async (format: "pdf" | "csv") => {
    setExporting(format);
    try {
      const url = await exportForecastReport(forecast.id, format);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* non-fatal */
    } finally {
      setExporting(null);
    }
  };

  if (!insights.horizon) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center">
        <p className="text-sm text-slate-500">This forecast returned no values.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        <ForecastResultsHeader
          datasetName={datasetName ?? forecast.dataset_name ?? "Dataset"}
          insights={insights}
          series={series}
          report={report}
          exporting={exporting}
          onBack={onBack ?? (() => window.history.back())}
          onExportPdf={() => handleExport("pdf")}
        />

        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition whitespace-nowrap ${
                tab === t
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Forecast Overview" && (
          // The chart carries five series and two axes, so it gets the full
          // width; the summary figures read fine side by side beneath it.
          <div className="space-y-4">
            {/* The evolution chart supersedes the single-series view once the
                per-stage series are available. */}
            {stageSeries?.length ? (
              <DataEvolutionChart
                insights={insights}
                stageSeries={stageSeries}
                report={report}
              />
            ) : (
              <ForecastOverviewChart
                insights={insights}
                series={series}
                report={report}
                historyStage={historyStage}
              />
            )}
            <div className="grid lg:grid-cols-2 gap-4 items-start">
              <ForecastSummaryCard insights={insights} />
              <BacktestPerformance forecast={forecast} insights={insights} />
            </div>
          </div>
        )}

        {tab === "Decisions" && (
          <div className="space-y-4">
            <ForecastHealth insights={insights} />
            <EnergyIntelligence insights={insights} report={report} />
            <div className="grid lg:grid-cols-2 gap-4">
              <KeyInsights insights={insights} report={report} />
              <SmartAlerts insights={insights} generatedAt={forecast.created_at} />
            </div>
            <ActionCentre insights={insights} report={report} />
            <PeakEventPair insights={insights} />
          </div>
        )}

        {tab === "Forecast Table" && (
          <div className="space-y-4">
            <ForecastKPIs insights={insights} />
            <DailyForecastTable insights={insights} />
          </div>
        )}

        {tab === "Diagnostics" && (
          <div className="space-y-4">
            <RiskAnalysis insights={insights} />
            <OperationalCalendar insights={insights} />
            <div className="grid lg:grid-cols-2 gap-4">
              <ConfidenceTimeline insights={insights} />
              <CostImpact insights={insights} />
            </div>
            <CompareWithHistory insights={insights} report={report} />
          </div>
        )}

        {tab === "Model Details" && (
          <div className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <ForecastDrivers forecast={forecast} insights={insights} report={report} />
              <ModelPerformance forecast={forecast} />
            </div>
          </div>
        )}

        {tab === "Export" && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-6">
            <GroupHeading>Download</GroupHeading>
            <p className="text-sm text-slate-600 mt-2">
              Export this forecast and its evaluation metrics for reporting or archiving.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => handleExport("pdf")}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50"
              >
                {exporting === "pdf" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileDown size={15} />
                )}
                Export PDF
              </button>
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition disabled:opacity-50"
              >
                {exporting === "csv" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={15} />
                )}
                Export CSV
              </button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
