import { useMemo } from "react";
import { CalendarRange } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { SeasonalityAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "./Section";
import { monthName, num, pct } from "./format";

/** Section 11 - how consumption moves across the calendar year. */
export default function SeasonalityAnalysis({ data }: { data: SeasonalityAnalysisData }) {
  const months = useMemo(
    () =>
      Object.entries(data.monthly_averages)
        .map(([month, value]) => ({ month: Number(month), label: monthName(Number(month)), value }))
        .sort((a, b) => a.month - b.month),
    [data.monthly_averages],
  );

  const strong = data.seasonal_variation_percent >= 20;

  return (
    <Section
      icon={CalendarRange}
      title="Seasonal Analysis"
      description="Average daily consumption by month of year."
      action={
        <Badge variant={strong ? "info" : "secondary"}>
          {strong ? "Strong seasonality" : "Mild seasonality"}
        </Badge>
      }
    >
      <div className="h-[180px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                padding: "6px 10px",
              }}
              formatter={(value) => [`${num(Number(value), 1)} kWh`, "Daily average"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {months.map((m) => (
                <Cell
                  key={m.month}
                  fill={
                    m.month === data.peak_month
                      ? "#f59e0b"
                      : m.month === data.lowest_month
                        ? "#10b981"
                        : "#cbd5e1"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <StatGrid cols={3}>
        <Stat
          label="Peak month"
          value={monthName(data.peak_month)}
          hint={`${num(data.monthly_averages[String(data.peak_month)], 1)} kWh/day`}
          tone="text-amber-600"
        />
        <Stat
          label="Lowest month"
          value={monthName(data.lowest_month)}
          hint={`${num(data.monthly_averages[String(data.lowest_month)], 1)} kWh/day`}
          tone="text-emerald-600"
        />
        <Stat
          label="Seasonal variation"
          value={pct(data.seasonal_variation_percent, 1)}
          hint="peak-to-trough spread"
        />
      </StatGrid>
    </Section>
  );
}
