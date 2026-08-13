import { Search } from "lucide-react";
import type { StageKey } from "../../../api/datasetsAPI";
import { STAGE_ORDER, STAGE_PURPOSE } from "../utils";

/**
 * Explains why the current checkpoint exists, in the facility manager's terms:
 * what produced this version, and what is being certified about it. Without
 * this every stage renders as an unlabelled wall of the same statistics.
 */
export default function StagePurposeHeader({ stage }: { stage: StageKey }) {
  const purpose = STAGE_PURPOSE[stage];
  const step = STAGE_ORDER.indexOf(stage) + 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Step {step} of {STAGE_ORDER.length} — Quality checkpoint
      </p>
      <h2 className="text-base font-bold text-slate-900 mt-1">{purpose.title}</h2>
      <p className="text-sm text-slate-600 mt-1.5">{purpose.did}</p>
      {purpose.checking && (
        <p className="inline-flex items-start gap-1.5 text-sm text-slate-500 mt-2">
          <Search size={14} className="mt-0.5 shrink-0 text-slate-400" />
          {purpose.checking}
        </p>
      )}
    </div>
  );
}
