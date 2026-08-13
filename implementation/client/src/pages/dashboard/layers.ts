import type { StageKey } from "@/api/datasetsAPI";

/**
 * The data-evolution palette. One colour per pipeline stage, used by the chart,
 * its legend and the layer toggles so a colour means the same thing everywhere.
 */
export type LayerKey = "RAW" | "CLEANED" | "OUTLIERS" | "STATIONARY" | "FORECAST";

export interface LayerMeta {
  key: LayerKey;
  label: string;
  /** Line colour (hex, for SVG). */
  colour: string;
  /** Tailwind classes for the toggle chip when active. */
  chip: string;
  /** Swatch background for legend/chip dots. */
  swatch: string;
  dashed?: boolean;
  /** Stationary values are differenced, so they need their own axis. */
  ownAxis?: boolean;
  description: string;
}

export const LAYERS: LayerMeta[] = [
  {
    key: "RAW",
    label: "Raw",
    colour: "#94a3b8",
    chip: "border-slate-400 bg-slate-100 text-slate-700",
    swatch: "bg-slate-400",
    description: "As uploaded — missing values, duplicates and outliers intact.",
  },
  {
    key: "CLEANED",
    label: "Cleaned",
    colour: "#2563eb",
    chip: "border-blue-400 bg-blue-50 text-blue-700",
    swatch: "bg-blue-600",
    description: "Duplicates removed, gaps filled, missing readings imputed. Outliers untouched.",
  },
  {
    key: "OUTLIERS",
    label: "Outliers Fixed",
    colour: "#10b981",
    chip: "border-emerald-400 bg-emerald-50 text-emerald-700",
    swatch: "bg-emerald-500",
    description: "Anomalous readings replaced. Physically valid.",
  },
  {
    key: "STATIONARY",
    label: "Stationary",
    colour: "#f59e0b",
    chip: "border-amber-400 bg-amber-50 text-amber-700",
    swatch: "bg-amber-500",
    ownAxis: true,
    description: "Differenced for the model. Period-over-period change, not kWh — plotted on the right axis.",
  },
  {
    key: "FORECAST",
    label: "Forecast",
    colour: "#7c3aed",
    chip: "border-violet-400 bg-violet-50 text-violet-700",
    swatch: "bg-violet-600",
    dashed: true,
    description: "30-day projection with a 95% confidence band.",
  },
];

export const LAYER_BY_KEY: Record<LayerKey, LayerMeta> = Object.fromEntries(
  LAYERS.map((l) => [l.key, l]),
) as Record<LayerKey, LayerMeta>;

export const FORECAST_BAND_FILL = "#7c3aed";
export const ANOMALY_COLOUR = "#f43f5e";

export interface Preset {
  label: string;
  layers: LayerKey[];
  hint: string;
}

/** One-click answers to the questions the chart exists to settle. */
export const PRESETS: Preset[] = [
  {
    label: "Raw vs Cleaned",
    layers: ["RAW", "CLEANED"],
    hint: "What cleaning changed",
  },
  {
    label: "Cleaned vs Outliers",
    layers: ["CLEANED", "OUTLIERS"],
    hint: "What outlier treatment changed",
  },
  {
    label: "Final vs Raw",
    layers: ["RAW", "OUTLIERS", "FORECAST"],
    hint: "Total effect of preprocessing",
  },
  {
    label: "Final dataset",
    layers: ["OUTLIERS", "FORECAST"],
    hint: "What the model was fitted on",
  },
  {
    label: "Forecast only",
    layers: ["FORECAST"],
    hint: "The projection alone",
  },
  {
    label: "Everything",
    layers: ["RAW", "CLEANED", "OUTLIERS", "STATIONARY", "FORECAST"],
    hint: "Every stage at once",
  },
];

/** The default view: the fitted series plus its projection. */
export const DEFAULT_LAYERS: LayerKey[] = ["OUTLIERS", "FORECAST"];

export const isStageLayer = (key: LayerKey): key is Exclude<LayerKey, "FORECAST"> =>
  key !== "FORECAST";

/** Stage keys the chart can request series for. */
export const HISTORY_STAGES: StageKey[] = ["RAW", "CLEANED", "OUTLIERS", "STATIONARY"];
