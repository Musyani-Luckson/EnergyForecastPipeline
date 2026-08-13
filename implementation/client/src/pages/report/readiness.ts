import type { ForecastingReadinessData } from "@/api/datasetsAPI";

export type ReadinessStatus = "READY" | "REVIEW" | "NOT READY";

/** Readiness is a score plus issues; the headline status is derived from both. */
export function readinessStatus(data: ForecastingReadinessData): ReadinessStatus {
  if (data.score >= 85 && data.issues.length === 0) return "READY";
  if (data.score >= 60) return "REVIEW";
  return "NOT READY";
}

export const READINESS_RECOMMENDATION: Record<ReadinessStatus, string> = {
  READY: "The dataset satisfies all preprocessing requirements and is ready for forecasting.",
  REVIEW:
    "The dataset is usable but carries unresolved quality issues. Review the findings below before forecasting.",
  "NOT READY":
    "The dataset does not yet meet the preprocessing requirements. Resolve the issues below before forecasting.",
};
