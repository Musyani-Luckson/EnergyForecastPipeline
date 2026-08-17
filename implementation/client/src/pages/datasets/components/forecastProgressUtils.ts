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

/** "(p,d,q)(P,D,Q)[s]" - the conventional way to write a SARIMA order. */
export function formatOrder(c: CandidateOrder | null | undefined): string {
  if (!c || c.order.length < 3) return "-";
  const [p, d, q] = c.order;
  const s = c.seasonal_order;
  const seasonal = s && s.length >= 4 ? `(${s[0]},${s[1]},${s[2]})[${s[3]}]` : "";
  return `(${p},${d},${q})${seasonal}`;
}
