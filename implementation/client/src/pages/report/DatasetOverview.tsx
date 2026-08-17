import { Database } from "lucide-react";

import type { DatasetOverviewData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "./Section";
import { int, num, shortDate } from "./format";

/** Section 1 - shape and span of the dataset. */
export default function DatasetOverview({ data }: { data: DatasetOverviewData }) {
  return (
    <Section
      icon={Database}
      title="Dataset Overview"
      description="Shape, span and structure of the records."
      action={<Badge variant="secondary">{int(data.rows)} rows</Badge>}
    >
      <StatGrid>
        <Stat label="Rows" value={int(data.rows)} />
        <Stat label="Columns" value={int(data.columns)} />
        <Stat label="Duration" value={`${int(data.duration_days)}d`} hint={`${num(data.duration_years, 2)} years`} />
        <Stat label="Coverage" value={shortDate(data.start_date)} hint={`to ${shortDate(data.end_date)}`} />
      </StatGrid>

      <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Columns</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {data.column_names.map((name) => (
            <Badge key={name} variant="outline" className="font-mono text-[11px]">
              {name}
            </Badge>
          ))}
        </div>
      </div>
    </Section>
  );
}
