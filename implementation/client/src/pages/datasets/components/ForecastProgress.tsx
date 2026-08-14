import { CheckCircle2, Loader2, Trophy } from "lucide-react";

import type {
  CandidateOrder, ForecastProgress as Progress, SelectedModel,
} from "@/api/datasetsAPI";
import { cn } from "@/lib/utils";

/**
 * Live progress of a forecast run.
 *
 * The engine reports three phases; the grid search is the only one with a
 * step count and it dominates the runtime, so it gets the determinate bar
 * and the feed of fitted candidates.
 */
const PHASES: { key: string; label: string; detail: string }[] = [
  { key: "differencing", label: "Testing stationarity", detail: "Finding the differencing orders that make the series stationary." },
  { key: "optimizing", label: "Searching SARIMA orders", detail: "Fitting each candidate order and ranking them by AIC." },
  { key: "forecasting", label: "Fitting final model", detail: "Fitting the selected order on the full history and projecting forward." },
];

/** One candidate the client observed while polling. */
export interface FittedEntry {
  key: string;
  label: string;
  /** Set when this candidate became the new lowest-AIC leader. */
  aic: number | null;
}

/** "(p,d,q)(P,D,Q)[s]" — the conventional way to write a SARIMA order. */
export function formatOrder(c: CandidateOrder | null | undefined): string {
  if (!c || c.order.length < 3) return "—";
  const [p, d, q] = c.order;
  const s = c.seasonal_order;
  const seasonal = s && s.length >= 4 ? `(${s[0]},${s[1]},${s[2]})[${s[3]}]` : "";
  return `(${p},${d},${q})${seasonal}`;
}

export default function ForecastProgress({
  progress,
  selected,
  fitted,
}: {
  progress: Progress | null;
  selected: SelectedModel | null;
  /** Candidates observed while polling, oldest first. */
  fitted: FittedEntry[];
}) {
  const step = progress?.step ?? "starting";
  const activeIndex = PHASES.findIndex((p) => p.key === step);
  // "starting" precedes every phase; "complete" follows all of them.
  const currentIndex = step === "complete" ? PHASES.length : activeIndex;

  const searching = step === "optimizing";
  const percent = progress?.percent ?? null;
  const showBar = searching && percent !== null;
  const done = !!selected && step === "complete";

  // Newest first: the interesting end of a feed that outgrows its box.
  const recent = [...fitted].reverse().slice(0, 8);

  return (
    <div className="mx-auto max-w-xl py-14">
      <div className="flex items-center gap-2.5">
        {done ? (
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
        ) : (
          <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />
        )}
        <h2 className="text-base font-semibold text-slate-900">
          {done ? "Forecast complete" : "Running SARIMA forecast…"}
        </h2>
      </div>

      {showBar && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-slate-600 tabular-nums">
              <span className="font-semibold text-slate-900">{progress!.done}</span>
              {" of "}
              <span className="font-semibold text-slate-900">{progress!.total}</span>
              {" candidate models fitted"}
            </p>
            <p className="text-sm font-semibold text-blue-700 tabular-nums">{percent}%</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <ol className="mt-6 space-y-3">
        {PHASES.map((phase, i) => {
          const complete = currentIndex > i;
          const active = currentIndex === i;
          return (
            <li key={phase.key} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">
                {complete ? (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                ) : active ? (
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                ) : (
                  <span className="block h-4 w-4 rounded-full border-2 border-slate-200" />
                )}
              </span>
              <div className="min-w-0">
                <p className={cn(
                  "text-sm",
                  active ? "font-semibold text-slate-900"
                    : complete ? "font-medium text-slate-500" : "text-slate-400",
                )}>
                  {phase.label}
                </p>
                {active && <p className="text-xs text-slate-500 mt-0.5">{phase.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {/* The search made visible. Polling samples the run rather than
          catching every fit, so this is labelled as what was observed —
          the authoritative count is the bar above. */}
      {recent.length > 0 && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Models fitted
            </p>
            {progress?.best && (
              <p className="text-[11px] text-slate-500 tabular-nums">
                Best so far{" "}
                <span className="font-semibold text-slate-700">
                  {formatOrder(progress.best)}
                </span>
                {typeof progress.best.aic === "number" && ` · AIC ${progress.best.aic.toFixed(2)}`}
              </p>
            )}
          </div>

          <ul className="mt-2 rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {recent.map((f, i) => (
              <li
                key={f.key}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-1.5",
                  i === 0 && !done ? "bg-blue-50/60" : "bg-white",
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {i === 0 && !done && (
                    <Loader2 size={12} className="animate-spin text-blue-600 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-700 tabular-nums truncate">
                    SARIMA {f.label}
                  </span>
                </span>
                {f.aic !== null && (
                  <span className="flex items-center gap-1 shrink-0 text-[11px] font-semibold text-emerald-700 tabular-nums">
                    <Trophy size={11} /> new best · AIC {f.aic.toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Sampled while the search ran; the count above is the full total.
          </p>
        </div>
      )}

      {/* The point of the search is which model it chose — so say so. */}
      {selected && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            <Trophy size={12} /> Selected model
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
            SARIMA {formatOrder(selected)}
          </p>
          {typeof selected.aic === "number" && (
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Lowest AIC {selected.aic.toFixed(2)}
              {typeof selected.bic === "number" && ` · BIC ${selected.bic.toFixed(2)}`}
            </p>
          )}
        </div>
      )}

      {!showBar && !selected && recent.length === 0 && (
        <p className="mt-5 text-xs text-slate-400">
          The grid search fits every candidate order — this can take a few minutes.
        </p>
      )}
    </div>
  );
}
