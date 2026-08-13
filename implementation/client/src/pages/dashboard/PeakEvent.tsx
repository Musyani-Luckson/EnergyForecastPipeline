import { Flame, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { cn } from "@/lib/utils";
import type { DayPoint, ForecastInsights } from "./insights";
import { shortWhen, whenLabel } from "./narrative";

interface EventCardProps {
  day: DayPoint | null;
  average: number;
  variant: "peak" | "trough";
}

/**
 * The single most and least demanding day in the horizon, each with the action
 * it implies — a peak to prepare for, or a quiet window to exploit.
 */
export default function PeakEvent({ day, average, variant }: EventCardProps) {
  if (!day) return null;

  const isPeak = variant === "peak";
  const deltaPct = average !== 0 ? ((day.value - average) / average) * 100 : 0;

  return (
    <Section
      icon={isPeak ? Flame : Wrench}
      title={isPeak ? "Peak Event" : "Lowest Demand"}
      description={isPeak ? "The day to plan around." : "The least disruptive window."}
      action={
        <Badge variant={isPeak ? "warning" : "success"}>
          {deltaPct >= 0 ? "+" : ""}
          {deltaPct.toFixed(0)}% vs average
        </Badge>
      }
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-2xl font-bold text-slate-900">{shortWhen(day)}</span>
        <span
          className={cn(
            "text-2xl font-bold tabular-nums",
            isPeak ? "text-amber-600" : "text-emerald-600",
          )}
        >
          {Math.round(day.value).toLocaleString()}
        </span>
        <span className="text-sm text-slate-400">kWh</span>
      </div>

      {day.lower != null && day.upper != null && (
        <p className="text-xs text-slate-500 mt-1">
          Likely between {Math.round(day.lower).toLocaleString()} and{" "}
          {Math.round(day.upper).toLocaleString()} kWh.
        </p>
      )}

      <div
        className={cn(
          "mt-3 rounded-lg border px-4 py-3",
          isPeak ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/50",
        )}
      >
        <p
          className={cn(
            "text-[10px] uppercase tracking-wide font-semibold",
            isPeak ? "text-amber-700/80" : "text-emerald-700/80",
          )}
        >
          {isPeak ? "Recommendation" : "Opportunity"}
        </p>
        <p className="text-sm text-slate-700 mt-0.5">
          {isPeak
            ? `Reduce discretionary load on ${whenLabel(day)} — consider pre-cooling, HVAC setpoint relaxation, or shifting flexible equipment away from the afternoon.`
            : `Schedule planned maintenance or equipment downtime around ${whenLabel(day)}, when demand is at its lowest.`}
        </p>
      </div>
    </Section>
  );
}

export function PeakEventPair({ insights }: { insights: ForecastInsights }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <PeakEvent day={insights.peak} average={insights.average} variant="peak" />
      <PeakEvent day={insights.trough} average={insights.average} variant="trough" />
    </div>
  );
}
