import type { CandidateOrder } from "@/api/datasetsAPI";

/**
 * Shared types and helpers for the forecast progress display.
 *
 * Kept out of the component file so that module exports only a component,
 * which is what fast refresh requires.
 */

/** One candidate the client observed while polling. */
export interface FittedEntry {
  key: string;
  label: string;
  /** Set when this candidate became the new lowest-AIC leader. */
  aic: number | null;
}

/**
 * Human-readable run duration: "48s", "3m 07s", "1h 12m".
 *
 * Seconds are kept alongside minutes because a grid search typically runs
 * for a few minutes, where a bare minute count would look frozen between
 * updates.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "-";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** "(p,d,q)(P,D,Q)[s]" - the conventional way to write a SARIMA order. */
export function formatOrder(c: CandidateOrder | null | undefined): string {
  if (!c || c.order.length < 3) return "-";
  const [p, d, q] = c.order;
  const s = c.seasonal_order;
  const seasonal = s && s.length >= 4 ? `(${s[0]},${s[1]},${s[2]})[${s[3]}]` : "";
  return `(${p},${d},${q})${seasonal}`;
}
