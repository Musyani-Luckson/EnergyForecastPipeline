import { Lightbulb, TrendingUp, TriangleAlert, CircleCheck } from "lucide-react";

import type { QualityReport } from "@/api/datasetsAPI";
import { Section } from "@/pages/report/Section";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";
import { keyInsights, type Tone } from "./narrative";

const ICON: Record<Tone, typeof CircleCheck> = {
  good: CircleCheck,
  watch: TriangleAlert,
  risk: TrendingUp,
};

const COLOUR: Record<Tone, string> = {
  good: "text-emerald-600",
  watch: "text-amber-600",
  risk: "text-rose-600",
};

/** The graph, read for you — stated rather than plotted. */
export default function KeyInsights({
  insights,
  report,
}: {
  insights: ForecastInsights;
  report?: QualityReport | null;
}) {
  const statements = keyInsights(insights, report);

  return (
    <Section
      icon={Lightbulb}
      title="Key Insights"
      description="The forecast in plain language."
    >
      <ul className="space-y-2">
        {statements.map((s, i) => {
          const Icon = ICON[s.tone];
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
              <Icon size={15} className={cn("mt-0.5 shrink-0", COLOUR[s.tone])} />
              <span>{s.text}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
