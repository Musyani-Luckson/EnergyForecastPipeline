import { Clock3 } from "lucide-react";

import type { FrequencyAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "./Section";
import { int, shortDate } from "./format";

const PREVIEW_LIMIT = 12;

/** Section 3 - is the series sampled at a regular interval, with no gaps? */
export default function FrequencyAnalysis({ data }: { data: FrequencyAnalysisData }) {
  const healthy = data.frequency_violations === 0 && data.missing_timestamp_count === 0;
  const preview = data.missing_timestamps.slice(0, PREVIEW_LIMIT);
  const remaining = data.missing_timestamps.length - preview.length;

  return (
    <Section
      icon={Clock3}
      title="Time Series Continuity"
      description="Regularity of the sampling interval across the series."
      action={
        <Badge variant={healthy ? "success" : "warning"}>
          {healthy ? "Continuous" : "Gaps detected"}
        </Badge>
      }
    >
      <StatGrid cols={3}>
        <Stat label="Expected frequency" value={data.expected_frequency} />
        <Stat
          label="Interval violations"
          value={int(data.frequency_violations)}
          tone={data.frequency_violations > 0 ? "text-amber-600" : "text-emerald-600"}
        />
        <Stat
          label="Missing timestamps"
          value={int(data.missing_timestamp_count)}
          tone={data.missing_timestamp_count > 0 ? "text-amber-600" : "text-emerald-600"}
        />
      </StatGrid>

      {preview.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-amber-700/80">Missing days</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {preview.map((ts) => (
              <Badge key={ts} variant="warning" className="text-[11px]">
                {shortDate(ts)}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="text-[11px]">
                +{int(remaining)} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}
