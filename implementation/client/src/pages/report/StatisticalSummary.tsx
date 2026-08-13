import { Sigma } from "lucide-react";

import type { StatisticalSummaryData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat } from "./Section";
import { compact, int, num } from "./format";

/** Section 6 — the descriptive statistics of the energy series. */
export default function StatisticalSummary({ data }: { data: StatisticalSummaryData }) {
  // Coefficient of variation gives the spread a scale-free reading.
  const cv = data.mean !== 0 ? (data.std / data.mean) * 100 : null;

  return (
    <Section
      icon={Sigma}
      title="Statistical Summary"
      description="Descriptive statistics for daily consumption (kWh)."
      action={<Badge variant="secondary">{int(data.count)} observations</Badge>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="Mean" value={num(data.mean, 1)} hint="kWh/day" />
        <Stat label="Median" value={num(data.median, 1)} hint="kWh/day" />
        <Stat label="Std deviation" value={num(data.std, 1)} hint={cv ? `CV ${num(cv, 1)}%` : undefined} />
        <Stat label="Variance" value={compact(data.variance)} />
        <Stat label="Minimum" value={num(data.min, 1)} hint="kWh" />
        <Stat label="Maximum" value={num(data.max, 1)} hint="kWh" />
        <Stat label="Range" value={num(data.range, 1)} hint="max − min" />
        <Stat label="Total consumption" value={compact(data.sum)} hint="kWh" />
      </div>
    </Section>
  );
}
