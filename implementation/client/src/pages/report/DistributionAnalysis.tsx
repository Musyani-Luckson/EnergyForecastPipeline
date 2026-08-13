import { useMemo } from "react";
import { BarChart3, Info } from "lucide-react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis } from "recharts";

import type { DistributionAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "./Section";
import { num } from "./format";

/** Abramowitz & Stegun 7.1.26 — good to ~1e-7, plenty for a shape curve. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}

const pdf = (x: number) => Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
const cdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));

/**
 * Skew-normal density, shaped by the measured skewness. This is an illustration
 * of the distribution's *shape* — the report API returns summary statistics
 * only, with no binned frequencies, so a true histogram isn't available.
 */
function densityCurve(skewness: number) {
  const alpha = Math.max(-6, Math.min(6, skewness * 2));
  const points = [];
  for (let x = -4; x <= 4; x += 0.1) {
    points.push({ x: Number(x.toFixed(2)), y: 2 * pdf(x) * cdf(alpha * x) });
  }
  return points;
}

function shapeLabel(data: DistributionAnalysisData): { text: string; variant: "success" | "warning" } {
  const magnitude = Math.abs(data.skewness);
  if (magnitude < 0.5) return { text: "Approximately normal", variant: "success" };
  if (data.is_right_skewed) return { text: "Right skewed", variant: "warning" };
  if (data.is_left_skewed) return { text: "Left skewed", variant: "warning" };
  return { text: "Symmetric", variant: "success" };
}

/** Section 7 — the shape of the consumption distribution. */
export default function DistributionAnalysis({ data }: { data: DistributionAnalysisData }) {
  const curve = useMemo(() => densityCurve(data.skewness), [data.skewness]);
  const shape = shapeLabel(data);

  // Fisher kurtosis: 0 is normal, >0 heavy-tailed, <0 light-tailed.
  const tails =
    data.kurtosis > 0.5 ? "Heavy tailed" : data.kurtosis < -0.5 ? "Light tailed" : "Normal tails";

  return (
    <Section
      icon={BarChart3}
      title="Distribution Analysis"
      description="Symmetry and tail weight of daily consumption."
      action={<Badge variant={shape.variant}>{shape.text}</Badge>}
    >
      <div className="h-[140px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curve} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="distFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="x" hide />
            <ReferenceLine x={0} stroke="#cbd5e1" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="y"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#distFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mb-3">
        <Info size={12} className="mt-0.5 shrink-0" />
        Shape illustration derived from the measured skewness — not a histogram of the readings.
      </p>

      <StatGrid cols={3}>
        <Stat
          label="Skewness"
          value={num(data.skewness, 3)}
          hint={shape.text.toLowerCase()}
          tone={Math.abs(data.skewness) > 1 ? "text-amber-600" : "text-slate-900"}
        />
        <Stat
          label="Kurtosis"
          value={num(data.kurtosis, 3)}
          hint={tails.toLowerCase()}
          tone={Math.abs(data.kurtosis) > 1 ? "text-amber-600" : "text-slate-900"}
        />
        <Stat label="Symmetry" value={shape.text} />
      </StatGrid>
    </Section>
  );
}
