/**
 * Forecast decision-support dashboard.
 *
 * The composed view is `ForecastDashboard`; every card is also exported so a
 * different layout can be assembled from the same pieces. Cards take derived
 * `ForecastInsights` rather than the raw payload, so the derivation rules live
 * in exactly one place.
 */

export { default as Dashboard } from "./Dashboard";
export { default as ForecastDashboard } from "./ForecastDashboard";

// Portfolio (landing) view.
export { default as PortfolioKPIs } from "./PortfolioKPIs";
export { default as PipelineFunnel } from "./PipelineFunnel";
export { default as NeedsAttention } from "./NeedsAttention";
export { default as RecentForecasts } from "./RecentForecasts";
export { buildPortfolio, nextActionFor, relativeTime } from "./portfolio";
export type { Portfolio, RunSummary } from "./portfolio";
export { default as ForecastPage } from "./ForecastPage";

export { default as ForecastResultsHeader } from "./ForecastResultsHeader";
export { default as ForecastOverviewChart } from "./ForecastOverviewChart";
export { default as DataEvolutionChart } from "./DataEvolutionChart";
export { default as ForecastSummaryCard } from "./ForecastSummaryCard";
export { default as BacktestPerformance } from "./BacktestPerformance";

export { default as ForecastHealth } from "./ForecastHealth";
export { default as EnergyIntelligence } from "./EnergyIntelligence";
export { default as KeyInsights } from "./KeyInsights";
export { default as ActionCentre } from "./ActionCentre";
export { default as SmartAlerts } from "./SmartAlerts";
export { default as RiskAnalysis } from "./RiskAnalysis";
export { default as ForecastKPIs } from "./ForecastKPIs";
export { default as PeakEvent, PeakEventPair } from "./PeakEvent";
export { default as ForecastChart } from "./ForecastChart";
export { default as OperationalCalendar } from "./OperationalCalendar";
export { default as ConfidenceTimeline } from "./ConfidenceTimeline";
export { default as CompareWithHistory } from "./CompareWithHistory";
export { default as CostImpact } from "./CostImpact";
export { default as ForecastDrivers } from "./ForecastDrivers";
export { default as ModelPerformance } from "./ModelPerformance";
export { default as DailyForecastTable } from "./DailyForecastTable";

// Derivation layer, kept separate from the components that render it.
export { buildInsights } from "./insights";
export {
  keyInsights, recommendedActions, smartAlerts, energyNarrative, whenLabel, shortWhen,
} from "./narrative";

export type { ForecastInsights, DayPoint, RiskLevel, Verdict } from "./insights";
export type { Statement, ActionItem, Tone } from "./narrative";

// Shared stage palette — keep colour meaning consistent across the app.
export { LAYERS, LAYER_BY_KEY, PRESETS, DEFAULT_LAYERS, HISTORY_STAGES } from "./layers";
export type { LayerKey, LayerMeta, Preset } from "./layers";
