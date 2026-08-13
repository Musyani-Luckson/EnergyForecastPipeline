import type { QualityReport } from "@/api/datasetsAPI";
import type { DayPoint, ForecastInsights } from "./insights";

/**
 * Turns the derived figures into the sentences a facility manager reads first.
 *
 * These are rule-based, not model-generated: every statement is traceable to a
 * number in `ForecastInsights`, so nothing here can assert something the data
 * doesn't support.
 */

export type Tone = "good" | "watch" | "risk";

export interface Statement {
  tone: Tone;
  text: string;
}

export interface ActionItem {
  title: string;
  detail: string;
  /** Supporting figure, e.g. the estimated peak. */
  metric?: { label: string; value: string };
  tone: Tone;
}

const pct = (v: number, d = 1) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`;
const kwh = (v: number) => `${Math.round(v).toLocaleString()} kWh`;

/** "14 January" when dates are known, otherwise "day 14 of the horizon". */
export function whenLabel(day: DayPoint | null): string {
  if (!day) return "—";
  if (!day.date) return `day ${day.step}`;
  return day.date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export function shortWhen(day: DayPoint | null): string {
  if (!day) return "—";
  if (!day.date) return `Day ${day.step}`;
  return day.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Key insights — the "tell them, don't make them read the graph" list. */
export function keyInsights(ins: ForecastInsights, report?: QualityReport | null): Statement[] {
  const out: Statement[] = [];

  if (Math.abs(ins.growthPercent) < 1) {
    out.push({ tone: "good", text: `Demand stays broadly flat across the next ${ins.horizon} days.` });
  } else {
    const rising = ins.growthPercent > 0;
    out.push({
      tone: rising ? "watch" : "good",
      text: `Average demand will ${rising ? "increase" : "decrease"} ${Math.abs(ins.growthPercent).toFixed(1)}% over the next ${ins.horizon} days.`,
    });
  }

  if (ins.peak) {
    out.push({
      tone: (ins.peakAbovePercent ?? 0) >= 25 ? "watch" : "good",
      text: `Highest demand expected ${whenLabel(ins.peak)} at ${kwh(ins.peak.value)}.`,
    });
  }

  if (ins.vsHistoricalPercent != null) {
    const diff = ins.vsHistoricalPercent;
    out.push({
      tone: Math.abs(diff) > 15 ? "watch" : "good",
      text: `Forecast average is ${pct(diff)} against the historical daily average.`,
    });
  }

  out.push(
    ins.volatilityRisk === "LOW"
      ? { tone: "good", text: "No unusual forecast instability." }
      : {
          tone: "watch",
          text: `Day-to-day variation is ${ins.volatilityPercent.toFixed(1)}% — higher than typical.`,
        },
  );

  if (ins.usesSeasonality) {
    out.push({
      tone: "good",
      text: ins.seasonalPeriod
        ? `Historical seasonality detected and modelled on a ${ins.seasonalPeriod}-day cycle.`
        : "Historical seasonality detected and modelled.",
    });
  }

  if (ins.confidencePercent != null) {
    out.push(
      ins.confidencePercent >= 85
        ? { tone: "good", text: "Prediction confidence remains high across the horizon." }
        : {
            tone: "watch",
            text: `Prediction confidence averages ${ins.confidencePercent.toFixed(0)}% — interpret later days with care.`,
          },
    );
  }

  if (report && report.forecasting_readiness.issues.length === 0) {
    out.push({ tone: "good", text: "No preprocessing issues remain on the source dataset." });
  }

  return out;
}

/** Recommended actions — every insight paired with something to do. */
export function recommendedActions(ins: ForecastInsights, report?: QualityReport | null): ActionItem[] {
  const out: ActionItem[] = [];

  if (ins.peak && (ins.peakAbovePercent ?? 0) >= 15) {
    out.push({
      tone: (ins.peakAbovePercent ?? 0) >= 40 ? "risk" : "watch",
      title: `Review HVAC schedules before ${whenLabel(ins.peak)}`,
      detail: `Demand that day is forecast ${(ins.peakAbovePercent ?? 0).toFixed(0)}% above the horizon average. Consider load shifting or pre-cooling to flatten the peak.`,
      metric: { label: "Estimated peak", value: kwh(ins.peak.value) },
    });
  }

  if (ins.trough && ins.peak && ins.trough.step !== ins.peak.step) {
    out.push({
      tone: "good",
      title: `Schedule maintenance around ${whenLabel(ins.trough)}`,
      detail:
        "This is the lowest forecast demand in the horizon — the least disruptive window for planned downtime or equipment work.",
      metric: { label: "Forecast demand", value: kwh(ins.trough.value) },
    });
  }

  const outlierPct = report?.outlier_analysis?.iqr_method?.outlier_percentage ?? 0;
  const outlierCount = report?.outlier_analysis?.iqr_method?.outlier_count ?? 0;
  if (outlierCount > 0) {
    out.push({
      tone: outlierPct >= 5 ? "watch" : "good",
      title: `Investigate ${outlierCount} historical anomal${outlierCount === 1 ? "y" : "ies"}`,
      detail:
        "Readings outside the IQR fences were found in the source data. Confirming whether these were real events or metering faults will improve future forecasts.",
      metric: { label: "Share of readings", value: `${outlierPct.toFixed(2)}%` },
    });
  }

  if (ins.intervalWidening != null && ins.intervalWidening >= 1.5) {
    out.push({
      tone: "watch",
      title: "Re-forecast before acting on the later horizon",
      detail: `The confidence interval widens ${ins.intervalWidening.toFixed(1)}× across the horizon. Plans beyond the first two weeks should be revisited as new readings arrive.`,
    });
  }

  if (report && report.forecasting_readiness.issues.length === 0) {
    out.push({
      tone: "good",
      title: "No preprocessing issues remain",
      detail: "The source dataset passed every quality checkpoint — the forecast is suitable for operational planning.",
    });
  }

  return out;
}

/** Smart alerts — the things that would warrant a notification. */
export function smartAlerts(ins: ForecastInsights): Statement[] {
  const out: Statement[] = [];

  if (ins.vsHistoricalPercent != null && Math.abs(ins.vsHistoricalPercent) >= 10) {
    out.push({
      tone: ins.vsHistoricalPercent > 0 ? "risk" : "watch",
      text: `Forecast ${ins.vsHistoricalPercent > 0 ? "exceeds" : "falls below"} the historical average by ${Math.abs(ins.vsHistoricalPercent).toFixed(0)}%.`,
    });
  }

  if (ins.peak && (ins.peakAbovePercent ?? 0) >= 25) {
    out.push({ tone: "watch", text: `Peak demand expected ${whenLabel(ins.peak)}.` });
  }

  if (ins.intervalWidening != null && ins.intervalWidening >= 1.5) {
    const crossing = ins.days.find(
      (d) => d.relativeWidth != null && d.relativeWidth >= (ins.days[0].relativeWidth ?? 0) * 1.5,
    );
    out.push({
      tone: "watch",
      text: crossing
        ? `Confidence interval widens sharply after ${whenLabel(crossing)}.`
        : "Confidence interval widens materially across the horizon.",
    });
  }

  if (ins.volatilityRisk !== "LOW") {
    out.push({
      tone: ins.volatilityRisk === "HIGH" ? "risk" : "watch",
      text: `Day-to-day demand variation of ${ins.volatilityPercent.toFixed(0)}% is above normal.`,
    });
  }

  if (!out.length) {
    out.push({ tone: "good", text: "No alerts — the forecast shows no abnormal behaviour." });
  }

  return out;
}

/** The Energy Intelligence narrative — prose, in reading order. */
export function energyNarrative(ins: ForecastInsights, report?: QualityReport | null): string[] {
  const lines: string[] = [];

  const shape =
    Math.abs(ins.growthPercent) < 2
      ? "stable"
      : ins.growthPercent > 0
        ? "rising"
        : "declining";
  lines.push(
    `The forecast indicates a ${shape} energy demand pattern over the next ${ins.horizon} days, averaging ${kwh(ins.average)} per day.`,
  );

  if (ins.peak) {
    lines.push(
      `One significant peak is expected on ${whenLabel(ins.peak)}, reaching ${kwh(ins.peak.value)}.`,
    );
    if (ins.peakAbovePercent != null) {
      lines.push(
        `This peak exceeds the forecast daily average by approximately ${ins.peakAbovePercent.toFixed(0)}%.`,
      );
    }
  }

  if (ins.usesSeasonality) {
    lines.push("Seasonality appears consistent with previous periods and is captured by the model.");
  } else {
    lines.push("The fitted model uses no seasonal terms, so recurring weekly patterns may not be represented.");
  }

  if (ins.confidencePercent != null) {
    lines.push(
      ins.confidencePercent >= 85
        ? "Forecast confidence remains high throughout the horizon."
        : `Forecast confidence averages ${ins.confidencePercent.toFixed(0)}% and declines toward the end of the horizon.`,
    );
  }

  lines.push(
    ins.overallRisk === "LOW"
      ? "No abnormal forecast behaviour was detected."
      : "Some aspects of this forecast warrant review before operational use.",
  );

  if (report) {
    lines.push(
      `The source dataset scored ${report.forecasting_readiness.score}/100 on forecast readiness (grade ${report.forecasting_readiness.grade}).`,
    );
  }

  return lines;
}
