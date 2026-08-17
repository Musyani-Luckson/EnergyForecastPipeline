import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import type { TrendAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "./Section";
import { isSignificant, num } from "./format";

const DIRECTION = {
  increasing: { icon: TrendingUp, variant: "warning" as const, label: "Increasing" },
  decreasing: { icon: TrendingDown, variant: "success" as const, label: "Decreasing" },
  stable: { icon: Minus, variant: "secondary" as const, label: "Stable" },
};

/** Section 10 - the long-run direction of consumption. */
export default function TrendAnalysis({
  data,
  /** Number of observations, so the fitted line spans the real series length. */
  observations = 100,
}: {
  data: TrendAnalysisData;
  observations?: number;
}) {
  // The fitted regression line itself: y = slope·x + intercept, over the series.
  const line = useMemo(() => {
    const steps = 40;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const x = (i / steps) * observations;
      return { x, y: data.slope * x + data.intercept };
    });
  }, [data.slope, data.intercept, observations]);

  const meta = DIRECTION[data.direction] ?? DIRECTION.stable;
  const Icon = meta.icon;
  const significant = isSignificant(data.p_value);
  // Daily slope is tiny; the yearly figure is what a facility manager acts on.
  const perYear = data.slope * 365;

  return (
    <Section
      icon={TrendingUp}
      title="Trend Analysis"
      description="Linear regression of consumption over the series."
      action={
        <Badge variant={meta.variant} className="gap-1">
          <Icon size={12} /> {meta.label}
        </Badge>
      }
    >
      <div className="h-[110px] -mx-2 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={line} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Line
              type="linear"
              dataKey="y"
              stroke={data.direction === "decreasing" ? "#10b981" : "#f59e0b"}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <StatGrid>
        <Stat label="Slope" value={num(data.slope, 4)} hint="kWh per day" />
        <Stat
          label="Annualised"
          value={`${perYear >= 0 ? "+" : ""}${num(perYear, 1)}`}
          hint="kWh per year"
          tone={perYear > 0 ? "text-amber-600" : "text-emerald-600"}
        />
        <Stat label="R²" value={num(data.r_squared, 4)} hint="variance explained" />
        <Stat
          label="p-value"
          value={num(data.p_value, 4)}
          hint={significant ? "significant" : "not significant"}
          tone={significant ? "text-emerald-600" : "text-slate-500"}
        />
      </StatGrid>

      <p className="text-xs text-slate-500 mt-3">
        Consumption is <span className="font-medium text-slate-700">{data.direction}</span> at{" "}
        {num(Math.abs(data.slope), 4)} kWh/day
        {significant
          ? ", a statistically significant trend"
          : ", though the trend is not statistically significant"}
        . The fit explains {num(data.r_squared * 100, 1)}% of the variation.
      </p>
    </Section>
  );
}
