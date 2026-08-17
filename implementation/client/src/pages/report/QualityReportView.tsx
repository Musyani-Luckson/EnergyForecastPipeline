import type { ReactNode } from "react";

import type { QualityReport } from "@/api/datasetsAPI";
import ExecutiveSummary from "./ExecutiveSummary";
import ForecastReadiness from "./ForecastReadiness";
import FindingsPanel from "./FindingsPanel";
import DatasetOverview from "./DatasetOverview";
import DateCoverage from "./DateCoverage";
import FrequencyAnalysis from "./FrequencyAnalysis";
import MissingValues from "./MissingValues";
import DuplicateAnalysis from "./DuplicateAnalysis";
import DomainConstraintValidation from "./DomainConstraintValidation";
import StatisticalSummary from "./StatisticalSummary";
import DistributionAnalysis from "./DistributionAnalysis";
import EnergyValueAnalysis from "./EnergyValueAnalysis";
import OutlierAnalysis from "./OutlierAnalysis";
import TrendAnalysis from "./TrendAnalysis";
import SeasonalityAnalysis from "./SeasonalityAnalysis";
import AnnualBreakdown from "./AnnualBreakdown";
import StationarityAnalysis from "./StationarityAnalysis";
import DifferencingAnalysis from "./DifferencingAnalysis";

function GroupHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 pt-2">
      {children}
    </h2>
  );
}

/**
 * Default composition of the full quality report: verdict first, then the
 * plain-language findings, then the detailed sections grouped by what they
 * answer — data integrity, consumption behaviour, and model assumptions.
 *
 * Sections are independent, so callers that need a different order or subset
 * can import them individually from `@/pages/report` instead of using this.
 */
export default function QualityReportView({
  report,
  previous,
}: {
  report: QualityReport;
  /**
   * The preceding checkpoint, if any. Only used to report what a transformation
   * corrected — a single report describes one version and can't know that.
   */
  previous?: QualityReport | null;
}) {
  // Negative readings the previous checkpoint carried that this one no longer
  // does. Zero for the great majority of datasets, which then never see the
  // domain-constraint panel at all.
  const invalidBefore = previous?.energy_value_analysis?.negative_values_count ?? 0;
  const invalidNow = report.energy_value_analysis.negative_values_count;
  // A differenced version has no domain constraint to report: its negative
  // entries are decreases in demand, so counting them as invalid readings
  // would present ordinary behaviour as a violation.
  const isDifferenced = report.energy_value_analysis.is_differenced === true;
  const constraintApplied =
    !isDifferenced && (invalidBefore > invalidNow || invalidNow > 0);

  return (
    <div className="space-y-4">
      <ForecastReadiness data={report.forecasting_readiness} />
      <ExecutiveSummary report={report} />
      <FindingsPanel report={report} />

      <GroupHeading>Data integrity</GroupHeading>
      <div className="grid lg:grid-cols-2 gap-4">
        <DatasetOverview data={report.dataset_overview} />
        <DateCoverage data={report.date_coverage} />
        <FrequencyAnalysis data={report.frequency_analysis} />
        <MissingValues data={report.missing_values} />
        <DuplicateAnalysis data={report.duplicates} />
        <EnergyValueAnalysis data={report.energy_value_analysis} />
      </div>

      {constraintApplied && (
        <DomainConstraintValidation
          data={report.energy_value_analysis}
          corrected={Math.max(0, invalidBefore - invalidNow)}
        />
      )}

      <GroupHeading>Consumption behaviour</GroupHeading>
      <StatisticalSummary data={report.statistical_summary} />
      <div className="grid lg:grid-cols-2 gap-4">
        <DistributionAnalysis data={report.distribution_analysis} />
        <TrendAnalysis
          data={report.trend_analysis}
          observations={report.dataset_overview.rows}
        />
      </div>
      <SeasonalityAnalysis data={report.seasonality_analysis} />
      <AnnualBreakdown data={report.annual_breakdown} />

      <GroupHeading>Model assumptions</GroupHeading>
      <OutlierAnalysis data={report.outlier_analysis} />
      <div className="grid lg:grid-cols-2 gap-4">
        <StationarityAnalysis data={report.stationarity_analysis} />
        <DifferencingAnalysis data={report.differencing_analysis} />
      </div>
    </div>
  );
}
