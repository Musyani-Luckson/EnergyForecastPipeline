import { useMemo } from "react";
import { Activity, ChartPie, TrendingUp } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, PolarAngleAxis,
  RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import type { ForecastSummary } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/pages/report/Section";
import { STAGES } from "@/pages/datasets/utils";
import type { Portfolio } from "./portfolio";

const STAGE_FILL: Record<string, string> = {
  RAW: "#94a3b8",
  CLEANED: "#2563eb",
  OUTLIERS: "#10b981",
  STATIONARY: "#f59e0b",
  FORECAST: "#7c3aed",
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  padding: "6px 10px",
};

/**
 * Share of datasets that made it all the way through, as a single ring. The
 * one number a manager wants from the landing page.
 */
export function CompletionRing({ portfolio }: { portfolio: Portfolio }) {
  const value = Math.round(portfolio.completionPercent);
  const tone = value >= 80 ? "#10b981" : value >= 50 ? "#f59e0b" : "#f43f5e";
  const data = [{ name: "complete", value, fill: tone }];

  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <h2 className="text-sm font-semibold text-slate-900">Pipeline Completion</h2>
        <p className="text-xs text-slate-500 mt-0.5">Datasets carried through to a forecast.</p>

        <div className="relative h-[190px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="68%"
              outerRadius="100%"
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "#f1f5f9" }} isAnimationActive={false} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums" style={{ color: tone }}>
                {value}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {portfolio.completed} of {portfolio.total}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-violet-600" /> Forecast {portfolio.completed}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-slate-300" /> Waiting {portfolio.inProgress}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Where datasets sit, as a donut - complements the funnel's exact counts. */
export function StageDistribution({ portfolio }: { portfolio: Portfolio }) {
  const data = useMemo(
    () =>
      STAGES.map((s) => ({
        name: s.label,
        key: s.key,
        value: portfolio.byStage[s.key],
      })).filter((d) => d.value > 0),
    [portfolio.byStage],
  );

  return (
    <Section
      icon={ChartPie}
      title="Stage Distribution"
      description="How the portfolio splits across the pipeline."
      action={<Badge variant="secondary">{portfolio.total} datasets</Badge>}
    >
      <div className="flex items-center gap-4 flex-wrap">
        <div className="h-[170px] w-[170px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={STAGE_FILL[d.key]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: unknown, n: unknown) => [`${Number(v)} datasets`, String(n)]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex-1 min-w-[150px] space-y-1.5">
          {data.map((d) => (
            <li key={d.key} className="flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-2 text-slate-600">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ backgroundColor: STAGE_FILL[d.key] }}
                />
                {d.name}
              </span>
              <span className="font-semibold tabular-nums text-slate-800">
                {d.value}
                <span className="font-normal text-slate-400 ml-1">
                  ({((d.value / portfolio.total) * 100).toFixed(0)}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/** Uploads over the last twelve months - is the system actually being used? */
export function UploadActivity({ portfolio }: { portfolio: Portfolio }) {
  const data = useMemo(() => {
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("en-GB", { month: "short" }),
        count: 0,
      });
    }

    const index = new Map(months.map((m) => [m.key, m]));
    for (const run of portfolio.runs) {
      if (!run.uploadedAt) continue;
      const bucket = index.get(run.uploadedAt.slice(0, 7));
      if (bucket) bucket.count += 1;
    }
    return months;
  }, [portfolio.runs]);

  const total = data.reduce((a, m) => a + m.count, 0);

  return (
    <Section
      icon={Activity}
      title="Upload Activity"
      description="Datasets added over the last 12 months."
      action={<Badge variant="secondary">{total} in the last year</Badge>}
    >
      <div className="h-[160px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="uploadFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: unknown) => [`${Number(v)} uploaded`, "Datasets"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#uploadFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {total === 0 && (
        <p className="text-[11px] text-slate-400 mt-2">
          No uploads recorded in this window.
        </p>
      )}
    </Section>
  );
}

/** Average forecast demand per dataset, so outlier buildings stand out. */
export function DemandComparison({ forecasts }: { forecasts: ForecastSummary[] }) {
  const data = useMemo(
    () =>
      forecasts
        .map((f) => {
          const values = f.values ?? [];
          const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          const peak = values.length ? Math.max(...values) : 0;
          const name = f.dataset_name ?? f.run_id.slice(0, 8);
          return {
            name: name.length > 18 ? `${name.slice(0, 17)}…` : name,
            average: Math.round(avg),
            peak: Math.round(peak),
          };
        })
        .filter((d) => d.average > 0)
        .sort((a, b) => b.average - a.average),
    [forecasts],
  );

  if (!data.length) {
    return (
      <Section
        icon={TrendingUp}
        title="Forecast Demand by Dataset"
        description="Average projected daily consumption."
      >
        <p className="text-sm text-slate-500">
          No forecasts yet - run a dataset through the pipeline to compare demand here.
        </p>
      </Section>
    );
  }

  return (
    <Section
      icon={TrendingUp}
      title="Forecast Demand by Dataset"
      description="Average and peak projected daily consumption (kWh)."
      action={<Badge variant="secondary">{data.length} forecast</Badge>}
    >
      <div style={{ height: Math.max(160, data.length * 42) }} className="-mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            barGap={2}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickFormatter={(v) => Math.round(Number(v)).toLocaleString()}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={tooltipStyle}
              formatter={(v: unknown, n: unknown) => [
                `${Number(v).toLocaleString()} kWh`,
                n === "average" ? "Average daily" : "Peak day",
              ]}
            />
            <Bar dataKey="average" fill="#7c3aed" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            <Bar dataKey="peak" fill="#c4b5fd" radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-violet-600" /> Average daily
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-violet-300" /> Peak day
        </span>
      </div>
    </Section>
  );
}
