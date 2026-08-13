import { Gauge } from "lucide-react";

import type { QualityReport } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Section } from "./Section";
import { int, num, pct } from "./format";
import { cn } from "@/lib/utils";

type Health = "good" | "warn" | "bad";

interface Dimension {
  label: string;
  /** 0–100 health for the meter. */
  value: number;
  detail: string;
  health: Health;
}

const BAR: Record<Health, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-rose-500",
};

const TEXT: Record<Health, string> = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-rose-600",
};

/** Scores the six dimensions that decide whether a dataset can be forecast. */
function dimensions(report: QualityReport): Dimension[] {
  const coverage = report.date_coverage.completeness_percent;
  const missing = report.missing_values.missing_percentage;
  const dupes = report.duplicates.duplicate_rows + report.duplicates.duplicate_dates;
  const outliers = report.outlier_analysis.iqr_method.outlier_percentage;
  const valid = report.energy_value_analysis.is_energy_data_valid;
  const stationary = report.stationarity_analysis.is_stationary;

  return [
    {
      label: "Completeness",
      value: coverage,
      detail: pct(coverage, 1),
      health: coverage >= 99.5 ? "good" : coverage >= 90 ? "warn" : "bad",
    },
    {
      label: "Missing values",
      value: Math.max(0, 100 - missing * 10),
      detail: missing === 0 ? "None" : pct(missing),
      health: missing === 0 ? "good" : missing <= 5 ? "warn" : "bad",
    },
    {
      label: "Uniqueness",
      value: dupes === 0 ? 100 : Math.max(0, 100 - dupes),
      detail: dupes === 0 ? "No duplicates" : `${int(dupes)} duplicates`,
      health: dupes === 0 ? "good" : "warn",
    },
    {
      label: "Outlier load",
      value: Math.max(0, 100 - outliers * 5),
      detail: outliers === 0 ? "None" : pct(outliers),
      health: outliers === 0 ? "good" : outliers <= 5 ? "warn" : "bad",
    },
    {
      label: "Value integrity",
      value: valid ? 100 : 50,
      detail: valid ? "Valid" : "Flagged",
      health: valid ? "good" : "warn",
    },
    {
      label: "Stationarity",
      value: stationary ? 100 : 40,
      detail: stationary ? "Stationary" : `d = ${report.differencing_analysis.recommended_d ?? "?"}`,
      health: stationary ? "good" : "warn",
    },
  ];
}

/**
 * The "God's-eye" view: every quality dimension as a single meter, so the
 * dataset's overall health reads in one glance before any drill-down.
 */
export default function ExecutiveSummary({ report }: { report: QualityReport }) {
  const dims = dimensions(report);
  const overview = report.dataset_overview;
  const healthy = dims.filter((d) => d.health === "good").length;

  return (
    <Section
      icon={Gauge}
      title="Executive Summary"
      description={`${int(overview.rows)} records spanning ${num(overview.duration_years, 1)} years.`}
      action={
        <Badge variant={healthy === dims.length ? "success" : "warning"}>
          {healthy}/{dims.length} dimensions healthy
        </Badge>
      }
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3.5">
        {dims.map((d) => (
          <div key={d.label}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium text-slate-600">{d.label}</span>
              <span className={cn("text-xs font-semibold tabular-nums", TEXT[d.health])}>
                {d.detail}
              </span>
            </div>
            <Progress
              value={Math.min(100, Math.max(0, d.value))}
              className="h-1.5 bg-slate-100"
              indicatorClassName={BAR[d.health]}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
