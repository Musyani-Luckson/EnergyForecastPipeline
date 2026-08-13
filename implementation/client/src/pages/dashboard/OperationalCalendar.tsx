import { CalendarDays } from "lucide-react";

import { Section } from "@/pages/report/Section";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { DayPoint, ForecastInsights } from "./insights";

type Level = "low" | "medium" | "high";

const STYLE: Record<Level, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-rose-100 text-rose-800 border-rose-200",
};

/** Demand relative to the horizon average, in the terms an operator plans in. */
function level(day: DayPoint, average: number): Level {
  if (average === 0) return "low";
  const ratio = day.value / average;
  if (ratio >= 1.15) return "high";
  if (ratio >= 1.05) return "medium";
  return "low";
}

/** Day-by-day demand at a glance — the horizon as an operational calendar. */
export default function OperationalCalendar({ insights }: { insights: ForecastInsights }) {
  const counts = insights.days.reduce(
    (acc, d) => {
      acc[level(d, insights.average)] += 1;
      return acc;
    },
    { low: 0, medium: 0, high: 0 } as Record<Level, number>,
  );

  return (
    <Section
      icon={CalendarDays}
      title="Operational Calendar"
      description="Forecast demand for each day of the horizon."
    >
      <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
        {insights.days.map((d) => {
          const l = level(d, insights.average);
          return (
            <Tooltip key={d.step}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "rounded-md border px-1 py-1.5 text-center cursor-default",
                    STYLE[l],
                  )}
                >
                  <p className="text-[10px] font-semibold leading-none">
                    {d.date
                      ? d.date.toLocaleDateString("en-GB", { day: "numeric" })
                      : d.step}
                  </p>
                  <p className="text-[9px] tabular-nums mt-0.5 opacity-80">
                    {Math.round(d.value / 100) / 10}k
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {d.date
                  ? d.date.toLocaleDateString("en-GB", {
                      weekday: "short", day: "numeric", month: "short",
                    })
                  : `Day ${d.step}`}
                {" — "}
                {Math.round(d.value).toLocaleString()} kWh
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {(["low", "medium", "high"] as Level[]).map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={cn("size-2.5 rounded-sm border", STYLE[l])} />
            {l === "low" ? "Normal" : l === "medium" ? "Elevated" : "High"} ({counts[l]})
          </span>
        ))}
      </div>
    </Section>
  );
}
