import type { StageKey } from "../../../api/datasetsAPI";
import { stageLabel } from "../utils";

const TONES: Record<StageKey, string> = {
  RAW: "bg-slate-100 text-slate-600",
  CLEANED: "bg-sky-50 text-sky-700",
  OUTLIERS: "bg-amber-50 text-amber-700",
  STATIONARY: "bg-violet-50 text-violet-700",
  FORECAST: "bg-emerald-50 text-emerald-700",
};

export default function StageBadge({ stage }: { stage: StageKey }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONES[stage]}`}
    >
      {stageLabel(stage)}
    </span>
  );
}
