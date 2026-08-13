import { TrendingUp } from "lucide-react";
import type { StageKey } from "../../../api/datasetsAPI";
import { stageLabel } from "../utils";

function tone(score: number): { text: string; bar: string; dot: string } {
  if (score >= 85) return { text: "text-emerald-600", bar: "bg-emerald-500", dot: "bg-emerald-500" };
  if (score >= 60) return { text: "text-amber-600", bar: "bg-amber-500", dot: "bg-amber-500" };
  return { text: "text-rose-600", bar: "bg-rose-500", dot: "bg-rose-500" };
}

export interface TrajectoryPoint {
  stage: StageKey;
  score: number;
}

interface ReadinessScoreProps {
  score: number;
  grade: string;
  /** Score at each checkpoint reached so far, in pipeline order. */
  trajectory?: TrajectoryPoint[];
  /** True at the first checkpoint, where a low score is expected, not a failure. */
  isBaseline?: boolean;
  /**
   * Drop the grade/score hero and show only the progression. Used where the
   * full readiness card is already rendered elsewhere on the page.
   */
  compact?: boolean;
}

/**
 * Forecast-readiness headline. Beyond the current grade this shows the climb
 * across checkpoints, since that progression *is* the story the preprocessing
 * pipeline is telling.
 */
export default function ReadinessScore({
  score,
  grade,
  trajectory = [],
  isBaseline = false,
  compact = false,
}: ReadinessScoreProps) {
  const t = tone(score);
  const pct = Math.min(100, Math.max(0, score));
  const start = trajectory[0];
  const gained = start ? score - start.score : 0;
  const showTrail = trajectory.length > 1;

  // Compact mode carries only what the full readiness card can't: the climb.
  if (compact) {
    if (!showTrail && !isBaseline) return null;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-3.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Readiness across checkpoints
          </p>
          {gained > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
              <TrendingUp size={13} strokeWidth={2.5} /> Up {gained} points since upload
            </span>
          )}
        </div>
        {showTrail ? (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            {trajectory.map((p, i) => (
              <div key={p.stage} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-300 text-xs">→</span>}
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${tone(p.score).dot}`} />
                  <span className="text-[11px] text-slate-500">{stageLabel(p.stage)}</span>
                  <span className={`text-[11px] font-semibold tabular-nums ${tone(p.score).text}`}>
                    {p.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-1.5">
            This is your starting point. Each preprocessing step raises this score.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-5">
      <div className="flex items-center gap-6 flex-wrap">
        <div className={`text-5xl font-bold leading-none ${t.text}`}>{grade}</div>

        <div className="shrink-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Forecast readiness</p>
          <p className="text-3xl font-bold text-slate-900 tabular-nums leading-tight">{score}%</p>
        </div>

        <div className="flex-1 min-w-[180px]">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${t.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {isBaseline ? (
            <p className="text-xs text-slate-500 mt-2">
              This is your starting point. Each preprocessing step below raises this score.
            </p>
          ) : gained > 0 ? (
            <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 mt-2">
              <TrendingUp size={13} strokeWidth={2.5} />
              Up {gained} points since upload
            </p>
          ) : null}
        </div>
      </div>

      {showTrail && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
          {trajectory.map((p, i) => (
            <div key={p.stage} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300 text-xs">→</span>}
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${tone(p.score).dot}`} />
                <span className="text-[11px] text-slate-500">{stageLabel(p.stage)}</span>
                <span className={`text-[11px] font-semibold tabular-nums ${tone(p.score).text}`}>
                  {p.score}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
