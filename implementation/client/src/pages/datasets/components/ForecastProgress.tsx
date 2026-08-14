import { CheckCircle2, Loader2 } from "lucide-react";

import type { ForecastProgress as Progress, SelectedModel } from "@/api/datasetsAPI";

/**
 * Live progress of a forecast run.
 *
 * The engine reports three phases; the grid search is the only one with a
 * step count, and it dominates the runtime, so it gets the determinate bar
 * while the others show as indeterminate stages.
 */
const PHASES: { key: string; label: string; detail: string }[] = [
  { key: "differencing", label: "Testing stationarity", detail: "Finding the differencing orders that make the series stationary." },
  { key: "optimizing", label: "Searching SARIMA orders", detail: "Fitting each candidate order and ranking them by AIC." },
  { key: "forecasting", label: "Fitting final model", detail: "Fitting the selected order on the full history and projecting forward." },
];

const order = (o: number[] | undefined) => (o && o.length >= 3 ? `(${o[0]},${o[1]},${o[2]})` : "(—)");
const seasonal = (o: number[] | undefined) =>
  o && o.length >= 4 ? `(${o[0]},${o[1]},${o[2]})[${o[3]}]` : "";

export default function ForecastProgress({
  progress,
  selected,
}: {
  progress: Progress | null;
  selected: SelectedModel | null;
}) {
  const step = progress?.step ?? "starting";
  const activeIndex = PHASES.findIndex((p) => p.key === step);
  // "starting" precedes every phase; "complete" follows all of them.
  const currentIndex = step === "complete" ? PHASES.length : activeIndex;

  const isSearching = step === "optimizing";
  const percent = progress?.percent ?? null;
  const showBar = isSearching && percent !== null;

  return (
    <div className="mx-auto max-w-xl py-16">
      <div className="flex items-center gap-2.5">
        <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />
        <h2 className="text-base font-semibold text-slate-900">Running SARIMA forecast…</h2>
      </div>

      {/* Determinate bar for the grid search; the count is the honest measure
          of how much work is left, so it leads. */}
      {showBar && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-slate-600 tabular-nums">
              <span className="font-semibold text-slate-900">{progress!.done}</span>
              {" of "}
              <span className="font-semibold text-slate-900">{progress!.total}</span>
              {" candidate models evaluated"}
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
          const done = currentIndex > i;
          const active = currentIndex === i;
          return (
            <li key={phase.key} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">
                {done ? (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                ) : active ? (
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                ) : (
                  <span className="block h-4 w-4 rounded-full border-2 border-slate-200" />
                )}
              </span>
              <div>
                <p
                  className={
                    active
                      ? "text-sm font-semibold text-slate-900"
                      : done
                        ? "text-sm font-medium text-slate-500"
                        : "text-sm text-slate-400"
                  }
                >
                  {phase.label}
                </p>
                {active && <p className="text-xs text-slate-500 mt-0.5">{phase.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Once the search has settled, name the winning order — the point of
          the search is which model it chose, not merely that it finished. */}
      {selected && (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Selected model
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
            SARIMA {order(selected.order)}
            {seasonal(selected.seasonal_order)}
          </p>
          {typeof selected.aic === "number" && (
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Lowest AIC {selected.aic.toFixed(2)}
              {typeof selected.bic === "number" && ` · BIC ${selected.bic.toFixed(2)}`}
            </p>
          )}
        </div>
      )}

      {!showBar && !selected && (
        <p className="mt-5 text-xs text-slate-400">
          The grid search fits every candidate order — this can take a few minutes.
        </p>
      )}
    </div>
  );
}
