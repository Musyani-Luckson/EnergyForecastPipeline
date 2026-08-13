/**
 * Domain constraint policy — the physical limits the pipeline enforces on
 * metered consumption, independent of statistical outlier detection.
 *
 * The strategies below mirror the server's ReplacementEngine. Only
 * `local_median` is currently reachable: OutlierDetectionView hardcodes
 * `strategy="local_median", window=7` and accepts no strategy field on the
 * request, so the rest are declared but not yet selectable.
 */

export type ConstraintStrategy =
  | "local_median"
  | "global_median"
  | "mean"
  | "forward_fill"
  | "backward_fill";

export const STRATEGY_LABEL: Record<ConstraintStrategy, string> = {
  local_median: "Local Median",
  global_median: "Global Median",
  mean: "Mean",
  forward_fill: "Nearest Previous Valid",
  backward_fill: "Nearest Next Valid",
};

export const STRATEGY_DETAIL: Record<ConstraintStrategy, string> = {
  local_median:
    "Each invalid reading was replaced with the median of valid neighbours within a ±7-day window, preserving local consumption patterns.",
  global_median: "Each invalid reading was replaced with the median of the whole series.",
  mean: "Each invalid reading was replaced with the mean of the series.",
  forward_fill: "Each invalid reading was replaced with the closest earlier valid measurement.",
  backward_fill: "Each invalid reading was replaced with the closest later valid measurement.",
};

/** The strategy the server actually applies today. */
export const APPLIED_STRATEGY: ConstraintStrategy = "local_median";
