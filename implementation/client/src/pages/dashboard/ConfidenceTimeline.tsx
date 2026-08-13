import { useMemo } from "react";
import { Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { Progress } from "@/components/ui/progress";
import type { ForecastInsights } from "./insights";

const BUCKETS = 6;

/**
 * Confidence decays across a forecast horizon — the interval widens with every
 * step ahead. Showing that decay stops users trusting day 30 as much as day 1.
 */
export default function ConfidenceTimeline({ insights }: { insights: ForecastInsights }) {
  const segments = useMemo(() => {
    const withBounds = insights.days.filter((d) => d.relativeWidth != null);
    if (!withBounds.length) return [];

    const size = Math.ceil(withBounds.length / BUCKETS);
    const out: { label: string; confidence: number }[] = [];

    for (let i = 0; i < withBounds.length; i += size) {
      const slice = withBounds.slice(i, i + size);
      const avgWidth =
        slice.reduce((a, d) => a + (d.relativeWidth ?? 0), 0) / slice.length;
      const first = slice[0];
      const last = slice[slice.length - 1];
      out.push({
        label: first.date
          ? `${first.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
          : `Days ${first.step}–${last.step}`,
        confidence: Math.max(0, Math.min(100, 100 - (avgWidth / 2) * 100)),
      });
    }
    return out;
  }, [insights.days]);

  if (!segments.length) {
    return (
      <Section icon={Waves} title="Confidence Over Time" description="How certainty decays.">
        <p className="text-sm text-slate-500">
          No confidence intervals were returned for this forecast.
        </p>
      </Section>
    );
  }

  const drop = segments[0].confidence - segments[segments.length - 1].confidence;

  return (
    <Section
      icon={Waves}
      title="Confidence Over Time"
      description="Certainty declines the further ahead you look."
      action={
        <Badge variant={drop < 10 ? "success" : drop < 25 ? "warning" : "destructive"}>
          −{drop.toFixed(0)} pts across horizon
        </Badge>
      }
    >
      <div className="space-y-2.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-[92px] shrink-0">{s.label}</span>
            <Progress
              value={s.confidence}
              className="h-2 bg-slate-100 flex-1"
              indicatorClassName={
                s.confidence >= 85
                  ? "bg-emerald-500"
                  : s.confidence >= 70
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }
            />
            <span className="text-xs font-semibold tabular-nums text-slate-700 w-[38px] text-right">
              {s.confidence.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}
