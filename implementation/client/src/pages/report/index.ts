/**
 * Quality-report section components.
 *
 * Each section maps to one top-level object in the report API's `data` payload
 * and receives only its own slice of it, so sections stay independent and can
 * be composed in any order. `ExecutiveSummary` and `FindingsPanel` are the two
 * exceptions: both synthesise across sections, so they take the whole report.
 */

export { default as ReportHeader } from "./ReportHeader";
export { default as ExecutiveSummary } from "./ExecutiveSummary";
export { default as DatasetOverview } from "./DatasetOverview";
export { default as DateCoverage } from "./DateCoverage";
export { default as FrequencyAnalysis } from "./FrequencyAnalysis";
export { default as MissingValues } from "./MissingValues";
export { default as DuplicateAnalysis } from "./DuplicateAnalysis";
export { default as StatisticalSummary } from "./StatisticalSummary";
export { default as DistributionAnalysis } from "./DistributionAnalysis";
export { default as EnergyValueAnalysis } from "./EnergyValueAnalysis";
export { default as DomainConstraintValidation } from "./DomainConstraintValidation";
export { default as OutlierAnalysis } from "./OutlierAnalysis";
export { default as TrendAnalysis } from "./TrendAnalysis";
export { default as SeasonalityAnalysis } from "./SeasonalityAnalysis";
export { default as AnnualBreakdown } from "./AnnualBreakdown";
export { default as StationarityAnalysis } from "./StationarityAnalysis";
export { default as DifferencingAnalysis } from "./DifferencingAnalysis";
export { default as ForecastReadiness } from "./ForecastReadiness";
export { default as FindingsPanel } from "./FindingsPanel";

export { default as QualityReportView } from "./QualityReportView";

// Shared building blocks, exported for composing custom layouts.
export { Section, Stat, StatGrid } from "./Section";
export { default as CircularGauge } from "./CircularGauge";

// Derivation helpers, kept separate from the components that render them.
export { deriveFindings } from "./findings";
export { readinessStatus, READINESS_RECOMMENDATION } from "./readiness";
export { STRATEGY_LABEL, STRATEGY_DETAIL, APPLIED_STRATEGY } from "./constraints";

export type { Finding, FindingTone } from "./findings";
export type { ReadinessStatus } from "./readiness";
export type { ConstraintStrategy } from "./constraints";
