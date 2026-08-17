import { TriangleAlert } from "lucide-react";

import type { OutlierAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "./Section";
import { num, pct } from "./format";
import { cn } from "@/lib/utils";

/**
 * Box-and-whisker drawn from the real five-number summary. The API returns
 * aggregates rather than per-point values, so a box plot conveys the actual
 * distribution better than a scatter of synthesized points would.
 */
function BoxPlot({ iqr }: { iqr: OutlierAnalysisData["iqr_method"] }) {
  const { q1, q3, lower_bound, upper_bound } = iqr;

  // Pad the axis beyond the fences so the whisker caps aren't flush to the edge.
  const span = upper_bound - lower_bound;
  const padding = span > 0 ? span * 0.08 : 1;
  const min = lower_bound - padding;
  const max = upper_bound + padding;
  const scale = (v: number) => ((v - min) / (max - min)) * 100;

  const boxLeft = scale(q1);
  const boxWidth = Math.max(0.5, scale(q3) - boxLeft);
  const median = q1 + (q3 - q1) / 2; // midhinge - the API doesn't return the median here

  return (
    <div className="pt-6 pb-8 px-2">
      <div className="relative h-14">
        {/* Whisker spine */}
        <div
          className="absolute top-1/2 h-px bg-slate-300"
          style={{ left: `${scale(lower_bound)}%`, right: `${100 - scale(upper_bound)}%` }}
        />
        {/* Fence caps */}
        {[lower_bound, upper_bound].map((v, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-px h-6 bg-slate-400"
            style={{ left: `${scale(v)}%` }}
          />
        ))}
        {/* Interquartile box */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-10 rounded bg-blue-100 border border-blue-400"
          style={{ left: `${boxLeft}%`, width: `${boxWidth}%` }}
        />
        {/* Midhinge marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-10 bg-blue-600"
          style={{ left: `${scale(median)}%` }}
        />

        {/* Labels */}
        {[
          { v: lower_bound, label: "Lower fence", align: "left" as const },
          { v: q1, label: "Q1", align: "center" as const },
          { v: q3, label: "Q3", align: "center" as const },
          { v: upper_bound, label: "Upper fence", align: "right" as const },
        ].map(({ v, label, align }) => (
          <div
            key={label}
            className="absolute top-full mt-1.5 text-[10px] whitespace-nowrap"
            style={{
              left: `${scale(v)}%`,
              transform:
                align === "left"
                  ? "translateX(0)"
                  : align === "right"
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            <span className="block text-slate-400">{label}</span>
            <span className="block font-medium tabular-nums text-slate-600">{num(v, 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Section 9 - anomalous readings by IQR, cross-checked against Z-score. */
export default function OutlierAnalysis({ data }: { data: OutlierAnalysisData }) {
  const { iqr_method: iqr, zscore_method: z } = data;
  const clean = iqr.outlier_count === 0;
  const methodsAgree = iqr.outlier_count === z.outlier_count;

  return (
    <Section
      icon={TriangleAlert}
      title="Outlier Analysis"
      description="Extreme readings detected by the interquartile-range method."
      action={
        <Badge variant={clean ? "success" : iqr.outlier_percentage > 5 ? "destructive" : "warning"}>
          {clean ? "None detected" : `${iqr.outlier_count} outliers`}
        </Badge>
      }
    >
      <BoxPlot iqr={iqr} />

      <StatGrid>
        <Stat label="Q1 (25th pct)" value={num(iqr.q1, 1)} hint="kWh" />
        <Stat label="Q3 (75th pct)" value={num(iqr.q3, 1)} hint="kWh" />
        <Stat label="IQR" value={num(iqr.iqr, 1)} hint="Q3 − Q1" />
        <Stat
          label="Outliers"
          value={iqr.outlier_count.toLocaleString()}
          hint={pct(iqr.outlier_percentage)}
          tone={clean ? "text-emerald-600" : "text-amber-600"}
        />
      </StatGrid>

      <div className="mt-3 grid sm:grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Bounds (1.5 × IQR)</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-medium tabular-nums text-slate-800">
              {num(iqr.lower_bound, 1)}
            </span>
            <span className="text-slate-300">-</span>
            <span className="text-sm font-medium tabular-nums text-slate-800">
              {num(iqr.upper_bound, 1)}
            </span>
            <span className="text-[11px] text-slate-400">kWh</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Readings outside this range are treated as anomalous.
          </p>
        </div>

        <div
          className={cn(
            "rounded-lg border px-4 py-3",
            methodsAgree ? "border-slate-200" : "border-amber-200 bg-amber-50/40",
          )}
        >
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            Detection method comparison
          </p>
          <div className="flex items-center gap-4 mt-1.5">
            <div>
              <p className="text-[11px] text-slate-500">IQR</p>
              <p className="text-sm font-bold tabular-nums text-slate-800">
                {iqr.outlier_count} <span className="font-normal text-slate-400">({pct(iqr.outlier_percentage)})</span>
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <p className="text-[11px] text-slate-500">Z-score (&gt;3σ)</p>
              <p className="text-sm font-bold tabular-nums text-slate-800">
                {z.outlier_count} <span className="font-normal text-slate-400">({pct(z.outlier_percentage)})</span>
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {methodsAgree
              ? "Both methods agree on the count."
              : "The methods disagree - IQR is the one applied by the pipeline."}
          </p>
        </div>
      </div>
    </Section>
  );
}
