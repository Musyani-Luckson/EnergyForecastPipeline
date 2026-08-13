import { ArrowLeftRight } from "lucide-react";

import type { QualityReport } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MONTH_NAMES } from "@/pages/report/format";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";

interface Row {
  basis: string;
  reference: number;
  status: string;
}

/**
 * Puts the forecast next to what the building actually did. The comparisons
 * come from the source report's statistics — the API exposes no historical
 * series, so period-by-period baselines beyond these aren't available.
 */
export default function CompareWithHistory({
  insights,
  report,
}: {
  insights: ForecastInsights;
  report?: QualityReport | null;
}) {
  if (!report) {
    return (
      <Section
        icon={ArrowLeftRight}
        title="Compared With History"
        description="Forecast against past consumption."
      >
        <p className="text-sm text-slate-500">
          Historical comparison needs the source dataset's quality report, which isn't loaded here.
        </p>
      </Section>
    );
  }

  const stats = report.statistical_summary;
  const monthly = report.seasonality_analysis.monthly_averages;

  // The month the horizon opens in, so the seasonal baseline is like-for-like.
  const firstDate = insights.days[0]?.date;
  const seasonalMonth = firstDate ? firstDate.getMonth() + 1 : null;
  const seasonalAvg = seasonalMonth != null ? monthly[String(seasonalMonth)] : undefined;

  const rows: Row[] = [
    { basis: "Historical daily average", reference: stats.mean, status: "All records" },
    { basis: "Historical median", reference: stats.median, status: "All records" },
  ];

  if (seasonalAvg != null && seasonalMonth != null) {
    rows.push({
      basis: `Same month (${MONTH_NAMES[seasonalMonth - 1]}) average`,
      reference: seasonalAvg,
      status: "Seasonal baseline",
    });
  }

  return (
    <Section
      icon={ArrowLeftRight}
      title="Compared With History"
      description="Forecast against what the building actually consumed."
      action={
        insights.vsHistoricalPercent != null ? (
          <Badge variant={Math.abs(insights.vsHistoricalPercent) <= 10 ? "success" : "warning"}>
            {insights.vsHistoricalPercent >= 0 ? "+" : ""}
            {insights.vsHistoricalPercent.toFixed(1)}%
          </Badge>
        ) : undefined
      }
    >
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">Baseline</TableHead>
              <TableHead className="px-3 text-right">Reference</TableHead>
              <TableHead className="px-3 text-right">Forecast</TableHead>
              <TableHead className="px-3 text-right">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const diff = r.reference !== 0
                ? ((insights.average - r.reference) / r.reference) * 100
                : 0;
              return (
                <TableRow key={r.basis}>
                  <TableCell className="px-3">
                    <span className="text-slate-800">{r.basis}</span>
                    <span className="block text-[11px] text-slate-400">{r.status}</span>
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums text-slate-500">
                    {Math.round(r.reference).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums font-medium">
                    {Math.round(insights.average).toLocaleString()}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-3 text-right tabular-nums font-semibold",
                      Math.abs(diff) <= 10
                        ? "text-slate-600"
                        : diff > 0
                          ? "text-amber-600"
                          : "text-emerald-600",
                    )}
                  >
                    {diff >= 0 ? "+" : ""}
                    {diff.toFixed(1)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">All figures are daily kWh.</p>
    </Section>
  );
}
