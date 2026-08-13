import { ArrowLeft, CalendarDays, Clock, Download, Loader2 } from "lucide-react";

import type { ForecastSeries, QualityReport } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { readinessStatus } from "@/pages/report/readiness";
import type { ForecastInsights } from "./insights";

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : null;

interface ForecastResultsHeaderProps {
  datasetName: string;
  insights: ForecastInsights;
  series?: ForecastSeries | null;
  report?: QualityReport | null;
  exporting: "pdf" | "csv" | null;
  onBack: () => void;
  onExportPdf: () => void;
}

/** Title block for the forecast results view: identity, span, and exports. */
export default function ForecastResultsHeader({
  datasetName,
  insights,
  series,
  report,
  exporting,
  onBack,
  onExportPdf,
}: ForecastResultsHeaderProps) {
  const status = report ? readinessStatus(report.forecasting_readiness) : null;

  // Prefer the server's forecast period; fall back to the derived day dates.
  const start =
    fmt(series?.forecast_period?.start) ??
    (insights.days[0]?.date ? fmt(insights.days[0].date.toISOString()) : null);
  const end =
    fmt(series?.forecast_period?.end) ??
    (insights.days.at(-1)?.date ? fmt(insights.days.at(-1)!.date!.toISOString()) : null);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forecast Results</h1>
          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
            <p className="text-sm text-slate-500 break-words">Dataset: {datasetName}</p>
            {status && (
              <Badge
                variant={
                  status === "READY" ? "success" : status === "REVIEW" ? "warning" : "destructive"
                }
              >
                {status === "READY" ? "Ready for Forecasting" : status}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition"
          >
            <ArrowLeft size={15} /> Back to Dataset
          </button>
          <button
            onClick={onExportPdf}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 hover:border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition disabled:opacity-50"
          >
            {exporting === "pdf" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            Download Report (PDF)
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
          <Clock size={13} className="text-slate-400" />
          Forecast horizon:{" "}
          <span className="font-semibold text-slate-800">{insights.horizon} days</span>
        </span>
        {start && end && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            <CalendarDays size={13} className="text-slate-400" />
            <span className="font-semibold text-slate-800">
              {start} – {end}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
