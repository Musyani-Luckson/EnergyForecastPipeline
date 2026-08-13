import { Check, Minus } from "lucide-react";
import type { StageKey } from "../../../api/datasetsAPI";
import { STAGES, STAGE_ORDER } from "../utils";

interface StageStepperProps {
  active: StageKey;
  /** Stages already completed (a version exists / step finished). */
  completed: StageKey[];
  /** Optional stages the user chose not to apply. */
  skipped?: StageKey[];
  /** Revisit a completed checkpoint. Omit to keep the stepper read-only. */
  onSelect?: (stage: StageKey) => void;
}

/** Horizontal progress indicator across the five pipeline stages. */
export default function StageStepper({
  active,
  completed,
  skipped = [],
  onSelect,
}: StageStepperProps) {
  const activeIdx = STAGE_ORDER.indexOf(active);

  return (
    <div className="flex items-start">
      {STAGES.map((s, i) => {
        const wasSkipped = skipped.includes(s.key);
        const done = completed.includes(s.key) && !wasSkipped;
        const isActive = s.key === active;
        // Completed checkpoints stay open for review; the forecast has its own view.
        const revisitable = Boolean(onSelect) && done && !isActive && s.key !== "FORECAST";

        return (
          <div key={s.key} className="flex items-start flex-1 last:flex-none">
            <button
              type="button"
              disabled={!revisitable}
              onClick={revisitable ? () => onSelect!(s.key) : undefined}
              title={
                wasSkipped
                  ? `${s.label} was skipped`
                  : revisitable
                    ? `Review the ${s.label} checkpoint`
                    : s.description
              }
              className={`flex flex-col items-center gap-1.5 min-w-[64px] rounded-lg px-1 py-1 -my-1 transition ${
                revisitable ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
              }`}
            >
              <span
                className={`h-8 w-8 rounded-full grid place-items-center text-xs font-semibold transition ${
                  wasSkipped
                    ? "border border-dashed border-slate-300 bg-white text-slate-400"
                    : done
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-blue-600 text-white ring-4 ring-blue-100"
                        : "bg-slate-100 text-slate-400"
                } ${revisitable ? "group-hover:brightness-95" : ""}`}
              >
                {wasSkipped ? (
                  <Minus size={14} strokeWidth={3} />
                ) : done ? (
                  <Check size={14} strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wide text-center ${
                  isActive
                    ? "text-slate-700 font-semibold"
                    : done
                      ? `text-slate-500 ${revisitable ? "underline decoration-dotted underline-offset-2" : ""}`
                      : "text-slate-300"
                }`}
              >
                {s.label}
              </span>
              {wasSkipped && (
                <span className="text-[9px] uppercase tracking-wide text-slate-400">skipped</span>
              )}
            </button>

            {i < STAGES.length - 1 && (
              <div
                className={`h-px flex-1 mx-1 mt-4 ${
                  wasSkipped
                    ? "bg-slate-300"
                    : i < activeIdx || done
                      ? "bg-emerald-400"
                      : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
