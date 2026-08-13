import { useMemo } from "react";
import { LineChart, Info } from "lucide-react";
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import type { ForecastInsights } from "./insights";
import { shortWhen } from "./narrative";

/**
 * Forecast with its confidence band. Historical readings aren't overlaid: the
 * API exposes no raw-series endpoint, so the historical average is drawn as a
 * reference line instead of a fabricated curve.
 */
export default function ForecastChart({ insights }: { insights: ForecastInsights }) {
  const data = useMemo(
    () =>
      insights.days.map((d) => ({
        label: shortWhen(d),
        step: d.step,
        value: d.value,
        // Recharts stacks an Area from a [low, high] tuple for the band.
        band: d.lower != null && d.upper != null ? [d.lower, d.upper] : undefined,
      })),
    [insights.days],
  );

  return (
    <Section
      icon={LineChart}
      title="Forecast"
      description={`${insights.horizon}-day projection with 95% confidence band.`}
      action={
        insights.peak ? (
          <Badge variant="warning">Peak {shortWhen(insights.peak)}</Badge>
        ) : undefined
      }
    >
      <div className="h-[280px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={(v) => Math.round(Number(v)).toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                padding: "6px 10px",
              }}
              formatter={(value, name) =>
                name === "band"
                  ? [
                      (value as [number, number])
                        .map((v) => Math.round(v).toLocaleString())
                        .join(" – "),
                      "95% interval",
                    ]
                  : [`${Math.round(Number(value)).toLocaleString()} kWh`, "Forecast"]
              }
            />

            {insights.historicalAverage != null && (
              <ReferenceLine
                y={insights.historicalAverage}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: "Historical average",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "#94a3b8",
                }}
              />
            )}

            <Area
              dataKey="band"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.12}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-2">
        <Info size={12} className="mt-0.5 shrink-0" />
        Historical readings aren’t overlaid — the API returns forecast values only. The dashed line
        is the source dataset’s historical daily average.
      </p>
    </Section>
  );
}
