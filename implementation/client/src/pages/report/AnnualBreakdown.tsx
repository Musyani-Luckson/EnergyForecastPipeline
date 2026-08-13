import { useMemo } from "react";
import { Table as TableIcon } from "lucide-react";

import type { AnnualBreakdownData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Section } from "./Section";
import { int, num } from "./format";

/** Section 12 — year-by-year consumption, so multi-year drift is visible. */
export default function AnnualBreakdown({ data }: { data: AnnualBreakdownData }) {
  const years = useMemo(
    () =>
      Object.entries(data)
        .map(([year, stats]) => ({ year, ...stats }))
        .sort((a, b) => Number(a.year) - Number(b.year)),
    [data],
  );

  const means = years.map((y) => y.mean);
  const maxMean = means.length ? Math.max(...means) : 0;

  if (!years.length) {
    return (
      <Section icon={TableIcon} title="Annual Breakdown" description="Consumption by calendar year.">
        <p className="text-sm text-slate-500">No annual data available.</p>
      </Section>
    );
  }

  return (
    <Section
      icon={TableIcon}
      title="Annual Breakdown"
      description="Consumption by calendar year."
      action={<Badge variant="secondary">{years.length} years</Badge>}
    >
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">Year</TableHead>
              <TableHead className="px-3 text-right">Records</TableHead>
              <TableHead className="px-3 text-right">Mean</TableHead>
              <TableHead className="px-3 text-right">Min</TableHead>
              <TableHead className="px-3 text-right">Max</TableHead>
              <TableHead className="px-3 w-[110px]">Relative</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((y) => (
              <TableRow key={y.year}>
                <TableCell className="px-3 font-semibold text-slate-800">{y.year}</TableCell>
                <TableCell className="px-3 text-right tabular-nums">{int(y.records)}</TableCell>
                <TableCell className="px-3 text-right tabular-nums font-medium">
                  {num(y.mean, 1)}
                </TableCell>
                <TableCell className="px-3 text-right tabular-nums text-slate-500">
                  {num(y.min, 1)}
                </TableCell>
                <TableCell className="px-3 text-right tabular-nums text-slate-500">
                  {num(y.max, 1)}
                </TableCell>
                <TableCell className="px-3">
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${maxMean ? (y.mean / maxMean) * 100 : 0}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">Mean, min and max are daily kWh within each year.</p>
    </Section>
  );
}
