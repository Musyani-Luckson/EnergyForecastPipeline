/** Shared number/date formatting for the report sections. */

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const monthName = (month: number): string => MONTH_NAMES[month - 1] ?? String(month);

/** Fixed-decimal, with an em dash for missing/non-finite values. */
export function num(v: number | null | undefined, decimals = 2): string {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(decimals) : "—";
}

/** Thousands-separated integer. */
export function int(v: number | null | undefined): string {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v).toLocaleString() : "—";
}

/** Compact form for large kWh totals (1.2M, 340.5k). */
export function compact(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toFixed(1);
}

export const pct = (v: number | null | undefined, decimals = 2): string =>
  typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(decimals)}%` : "—";

/** Server dates arrive as "2023-01-01 00:00:00"; show just the day. */
export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * A p-value below 0.05 is conventionally significant. Used by both the
 * stationarity (ADF) and trend (regression) sections.
 */
export const isSignificant = (p: number): boolean => p < 0.05;
