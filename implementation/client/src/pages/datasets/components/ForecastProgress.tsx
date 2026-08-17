import { CheckCircle2, Clock, Loader2, Trophy } from "lucide-react";

import type { ForecastProgress as Progress, SelectedModel } from "@/api/datasetsAPI";
import { cn } from "@/lib/utils";
import { formatDuration, formatOrder, type FittedEntry } from "./forecastProgressUtils";

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

  // Taken straight from the server, which measures it from the job's own
  // start time: correct across a reload, immune to clock differences here,
  // and refreshed on every poll, which is often enough for a duration.
  const elapsed = progress?.elapsed_seconds ?? null;

  return (
    <div className="w-full py-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
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

        {/* How long this run has been going, so a search that takes minutes
            does not look stalled. */}
        {elapsed !== null && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tabular-nums",
              done ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
            )}
          >
            <Clock size={13} className="shrink-0" />
            {done ? `Completed in ${formatDuration(elapsed)}` : `${formatDuration(elapsed)} elapsed`}
          </div>
        )}
      </div>

      {/* Two columns across the full width: what the run is doing on the left,
          what the search has found on the right. They collapse to one column
          below lg, where side-by-side would squeeze both. */}
      <div className="mt-6 grid gap-x-10 gap-y-8 lg:grid-cols-2 items-start">
        <div>
      {showBar && (
            <div className="mb-6">
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

          <ol className="space-y-3">
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
            </div>

        {/* Right column: what the search has found so far. */}
        <div>
      {/* The search made visible. Polling samples the run rather than
              catching every fit, so this is labelled as what was observed -
              the authoritative count is the bar on the left. */}
          {recent.length > 0 && (
            <div>
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
                Sampled while the search ran; the count on the left is the full total.
              </p>
            </div>
          )}

          {/* The point of the search is which model it chose - so say so. */}
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
            <p className="text-xs text-slate-400">
              The grid search fits every candidate order - this can take a few minutes.
            </p>
          )}
            </div>
          </div>
        </div>
      );
    }
