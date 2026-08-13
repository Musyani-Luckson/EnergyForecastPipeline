import type { QualityReport } from "@/api/datasetsAPI";
import { monthName, num, pct } from "./format";
import { readinessStatus } from "./readiness";

export type FindingTone = "pass" | "warn" | "fail";

export interface Finding {
  tone: FindingTone;
  text: string;
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

/**
 * Turns the report's numbers into plain statements a facility manager can read
 * without interpreting a statistic. One finding per quality dimension.
 */
export function deriveFindings(report: QualityReport): Finding[] {
  const findings: Finding[] = [];

  const coverage = report.date_coverage;
  findings.push(
    coverage.completeness_percent >= 99.95
      ? { tone: "pass", text: "Dataset is 100% complete across its date range." }
      : {
          tone: coverage.completeness_percent >= 90 ? "warn" : "fail",
          text: `Dataset is ${pct(coverage.completeness_percent, 1)} complete — ${plural(coverage.missing_records, "calendar day")} absent.`,
        },
  );

  if (!coverage.passes_minimum_requirement) {
    findings.push({
      tone: "fail",
      text: `Only ${coverage.actual_records.toLocaleString()} records — below the ${coverage.minimum_required_records.toLocaleString()} minimum for reliable forecasting.`,
    });
  }

  const freq = report.frequency_analysis;
  findings.push(
    freq.frequency_violations === 0 && freq.missing_timestamp_count === 0
      ? {
          tone: "pass",
          text: `Sampling is continuous at the expected ${freq.expected_frequency.toLowerCase()} interval.`,
        }
      : {
          tone: "warn",
          text: `${plural(freq.frequency_violations, "interval violation")} and ${plural(freq.missing_timestamp_count, "missing timestamp")} detected.`,
        },
  );

  const missing = report.missing_values;
  findings.push(
    missing.total_missing === 0
      ? { tone: "pass", text: "No missing values detected." }
      : {
          tone: missing.missing_percentage > 5 ? "fail" : "warn",
          text: `${plural(missing.total_missing, "missing value")} across ${plural(missing.affected_rows, "row")} (${pct(missing.missing_percentage)}).`,
        },
  );

  const dupes = report.duplicates;
  findings.push(
    dupes.duplicate_rows === 0 && dupes.duplicate_dates === 0
      ? { tone: "pass", text: "No duplicate rows or timestamps found." }
      : {
          tone: "warn",
          text: `${plural(dupes.duplicate_rows, "duplicate row")} and ${plural(dupes.duplicate_dates, "duplicate date")} found.`,
        },
  );

  const energy = report.energy_value_analysis;
  findings.push(
    energy.is_energy_data_valid
      ? { tone: "pass", text: "Energy values are valid — no negative or zero readings." }
      : {
          tone: "warn",
          text: `${plural(energy.negative_values_count, "negative reading")} and ${plural(energy.zero_values_count, "zero reading")} require review.`,
        },
  );

  const outliers = report.outlier_analysis.iqr_method;
  findings.push(
    outliers.outlier_count === 0
      ? { tone: "pass", text: "No statistical outliers detected." }
      : {
          tone: outliers.outlier_percentage > 5 ? "warn" : "pass",
          text: `${plural(outliers.outlier_count, "statistical outlier")} detected (${pct(outliers.outlier_percentage)} of readings).`,
        },
  );

  const dist = report.distribution_analysis;
  if (Math.abs(dist.skewness) >= 1) {
    findings.push({
      tone: "warn",
      text: `Distribution is strongly ${dist.is_right_skewed ? "right" : "left"} skewed (skewness ${num(dist.skewness, 2)}).`,
    });
  }

  const trend = report.trend_analysis;
  if (trend.direction !== "stable" && trend.p_value < 0.05) {
    findings.push({
      tone: "warn",
      text: `Consumption is significantly ${trend.direction} — ${num(Math.abs(trend.slope * 365), 1)} kWh per year.`,
    });
  }

  const season = report.seasonality_analysis;
  findings.push({
    tone: "pass",
    text: `Peak consumption in ${monthName(season.peak_month)}, lowest in ${monthName(season.lowest_month)} — ${pct(season.seasonal_variation_percent, 1)} seasonal variation.`,
  });

  const adf = report.stationarity_analysis;
  findings.push(
    adf.is_stationary
      ? { tone: "pass", text: "Dataset is stationary." }
      : { tone: "warn", text: `Dataset is not stationary (ADF p-value ${num(adf.p_value, 4)}).` },
  );

  const diff = report.differencing_analysis;
  findings.push(
    !diff.differencing_required
      ? { tone: "pass", text: "No differencing required." }
      : diff.recommended_d === null
        ? { tone: "fail", text: "Stationarity not achieved even after second-order differencing." }
        : { tone: "warn", text: `Differencing of order d = ${diff.recommended_d} is required.` },
  );

  const status = readinessStatus(report.forecasting_readiness);
  findings.push(
    status === "READY"
      ? { tone: "pass", text: "Dataset is ready for forecasting." }
      : status === "REVIEW"
        ? { tone: "warn", text: "Dataset is usable but has unresolved quality issues." }
        : { tone: "fail", text: "Dataset is not yet ready for forecasting." },
  );

  return findings;
}
