import { Copy } from "lucide-react";

import type { DuplicatesData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Section, Stat, StatGrid } from "./Section";
import { int, shortDate } from "./format";

const PREVIEW_LIMIT = 10;

/** Section 5 - repeated rows and repeated timestamps. */
export default function DuplicateAnalysis({ data }: { data: DuplicatesData }) {
  const clean = data.duplicate_rows === 0 && data.duplicate_dates === 0;
  const preview = data.duplicate_timestamps.slice(0, PREVIEW_LIMIT);
  const remaining = data.duplicate_timestamps.length - preview.length;

  return (
    <Section
      icon={Copy}
      title="Duplicate Analysis"
      description="Repeated records and repeated dates in the series."
      action={
        <Badge variant={clean ? "success" : "warning"}>
          {clean ? "No duplicates" : `${int(data.duplicate_rows + data.duplicate_dates)} found`}
        </Badge>
      }
    >
      <StatGrid cols={2}>
        <Stat
          label="Duplicate rows"
          value={int(data.duplicate_rows)}
          hint="identical across all columns"
          tone={data.duplicate_rows > 0 ? "text-amber-600" : "text-emerald-600"}
        />
        <Stat
          label="Duplicate dates"
          value={int(data.duplicate_dates)}
          hint="same day recorded twice"
          tone={data.duplicate_dates > 0 ? "text-amber-600" : "text-emerald-600"}
        />
      </StatGrid>

      {preview.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3">Duplicated timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((ts, i) => (
                <TableRow key={`${ts}-${i}`}>
                  <TableCell className="px-3 text-xs">{shortDate(ts)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {remaining > 0 && (
            <p className="px-3 py-2 text-[11px] text-slate-400 border-t border-slate-200">
              +{int(remaining)} more not shown
            </p>
          )}
        </div>
      )}
    </Section>
  );
}
