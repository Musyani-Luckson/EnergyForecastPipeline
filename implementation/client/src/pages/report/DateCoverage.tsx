import { CalendarDays } from "lucide-react";

import type { DateCoverageData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat } from "./Section";
import CircularGauge from "./CircularGauge";
import { int, pct } from "./format";

/** Section 2 - how much of the expected calendar the dataset actually covers. */
export default function DateCoverage({ data }: { data: DateCoverageData }) {
  const complete = data.completeness_percent >= 99.5;
  const tone = complete
    ? "text-emerald-600"
    : data.completeness_percent >= 90
      ? "text-amber-600"
      : "text-rose-600";

  return (
    <Section
      icon={CalendarDays}
      title="Date Coverage"
      description="Records present against the expected daily calendar."
      action={
        <Badge variant={data.passes_minimum_requirement ? "success" : "destructive"}>
          {data.passes_minimum_requirement ? "Meets minimum" : "Below minimum"}
        </Badge>
      }
    >
      <div className="flex items-center gap-6 flex-wrap">
        <CircularGauge value={data.completeness_percent} tone={tone} />

        <div className="flex-1 min-w-[240px] grid grid-cols-2 gap-2.5">
          <Stat label="Expected" value={int(data.expected_records)} hint="calendar days" />
          <Stat label="Actual" value={int(data.actual_records)} hint="records present" />
          <Stat
            label="Missing"
            value={int(data.missing_records)}
            hint="absent days"
            tone={data.missing_records > 0 ? "text-amber-600" : "text-emerald-600"}
          />
          <Stat
            label="Minimum required"
            value={int(data.minimum_required_records)}
            hint={data.passes_minimum_requirement ? "satisfied" : "not yet met"}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        The dataset is {pct(data.completeness_percent)} complete across its date range.
        {data.missing_records > 0 && ` ${int(data.missing_records)} calendar days have no record.`}
      </p>
    </Section>
  );
}
