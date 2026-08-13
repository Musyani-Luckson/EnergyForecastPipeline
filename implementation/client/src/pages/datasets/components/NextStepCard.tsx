import { ArrowRight, Loader2, SkipForward } from "lucide-react";

export interface SecondaryAction {
  label: string;
  /** Why a user might choose this instead of the recommended step. */
  hint?: string;
  onClick: () => void;
}

interface NextStepCardProps {
  label: string;
  /** One line on what the step does in general. */
  summary?: string;
  /** What the step will do to *this* dataset, derived from the current report. */
  effects?: string[];
  /** When false, the step isn't wired yet and Continue is disabled. */
  available: boolean;
  busy: boolean;
  onContinue: () => void;
  /** Opt-out path for steps that are the user's choice rather than mandatory. */
  secondary?: SecondaryAction;
  /** Wording for the Continue button when "Continue" is too vague. */
  continueLabel?: string;
}

/**
 * The single recommended next action. States up front what the step will change
 * about this dataset, so advancing the pipeline is never a black box.
 */
export default function NextStepCard({
  label,
  summary,
  effects = [],
  available,
  busy,
  onContinue,
  secondary,
  continueLabel = "Continue",
}: NextStepCardProps) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 px-5 py-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-[11px] uppercase tracking-wide text-blue-600/70">
            Recommended next step
          </p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{label}</p>
          {summary && <p className="text-sm text-slate-600 mt-1">{summary}</p>}
          {!available && (
            <p className="text-xs text-slate-500 mt-1">This step isn’t available yet.</p>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-1.5">
          <button
            onClick={onContinue}
            disabled={!available || busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {continueLabel} <ArrowRight size={16} />
          </button>

          {secondary && (
            <>
              <button
                onClick={secondary.onClick}
                disabled={busy}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SkipForward size={15} /> {secondary.label}
              </button>
              {secondary.hint && (
                <p className="text-[11px] text-slate-500 text-center max-w-[220px]">
                  {secondary.hint}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {effects.length > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-200/70">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600/70">
            What this will do to your data
          </p>
          <ul className="mt-2 space-y-1">
            {effects.map((e) => (
              <li key={e} className="flex items-start gap-2 text-sm text-slate-700">
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-blue-500" />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
