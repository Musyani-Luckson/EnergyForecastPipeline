import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

/** Which direction of change counts as an improvement for this metric. */
export type Better = "lower" | "higher" | "neutral";

interface MetricTileProps {
  label: string;
  value: ReactNode;
  tone?: string;
  /** Raw numeric value at this checkpoint — required for a delta chip. */
  current?: number;
  /** Same metric at the previous checkpoint. */
  previous?: number;
  better?: Better;
  /**
   * Keep the delta row's height even with nothing to show, so a tile without a
   * comparable delta still lines up with its neighbours in the metrics grid.
   */
  reserveDelta?: boolean;
  /**
   * Whether this metric is what the current stage is responsible for. Focused
   * tiles are emphasised; the rest recede so that issues a later stage will fix
   * don't read as failures here.
   */
  focused?: boolean;
}

function DeltaChip({ current, previous, better = "neutral" }: {
  current: number;
  previous: number;
  better?: Better;
}) {
  const diff = current - previous;

  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400">
        <Minus size={11} strokeWidth={3} /> no change
      </span>
    );
  }

  const improved =
    better === "neutral" ? null : better === "lower" ? diff < 0 : diff > 0;
  const colour =
    improved === null
      ? "text-slate-500"
      : improved
        ? "text-emerald-600"
        : "text-amber-600";
  const Arrow = diff < 0 ? ArrowDown : ArrowUp;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${colour}`}>
      <Arrow size={11} strokeWidth={3} />
      {Math.abs(diff).toLocaleString()}
      <span className="font-normal text-slate-400 ml-0.5">
        from {previous.toLocaleString()}
      </span>
    </span>
  );
}

/** A single headline metric, with its change since the previous checkpoint. */
export default function MetricTile({
  label,
  value,
  tone,
  current,
  previous,
  better,
  reserveDelta = false,
  focused = false,
}: MetricTileProps) {
  const showDelta =
    typeof current === "number" &&
    typeof previous === "number" &&
    Number.isFinite(current) &&
    Number.isFinite(previous);
  const showDeltaRow = showDelta || reserveDelta || typeof current === "number";

  return (
    <div
      className={`rounded-xl border px-4 py-3.5 transition ${
        focused
          ? "border-blue-300 bg-blue-50/40 ring-1 ring-inset ring-blue-500/10"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-wide ${
          focused ? "text-blue-700/70 font-semibold" : "text-slate-400"
        }`}
      >
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${tone ?? "text-slate-900"}`}>
        {value}
      </p>
      {showDeltaRow && (
        <div className="mt-1 h-4">
          {showDelta && <DeltaChip current={current} previous={previous} better={better} />}
        </div>
      )}
    </div>
  );
}
