import { useState } from "react";
import { Table as TableIcon, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";
import { shortWhen } from "./narrative";

const COLLAPSED = 10;

/** The underlying numbers, for anyone who wants to check the working. */
export default function DailyForecastTable({ insights }: { insights: ForecastInsights }) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? insights.days : insights.days.slice(0, COLLAPSED);
  const hidden = insights.days.length - rows.length;

  return (
    <Section
      icon={TableIcon}
      title="Daily Forecast"
      description="Predicted demand for every day of the horizon."
      action={<Badge variant="secondary">{insights.horizon} days</Badge>}
    >
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">Day</TableHead>
              <TableHead className="px-3 text-right">Forecast</TableHead>
              <TableHead className="px-3 text-right">Lower</TableHead>
              <TableHead className="px-3 text-right">Upper</TableHead>
              <TableHead className="px-3 text-right">vs average</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => {
              const delta =
                insights.average !== 0
                  ? ((d.value - insights.average) / insights.average) * 100
                  : 0;
              const isPeak = d.step === insights.peak?.step;
              const isTrough = d.step === insights.trough?.step;
              return (
                <TableRow key={d.step} className={cn(isPeak && "bg-amber-50/60", isTrough && "bg-emerald-50/60")}>
                  <TableCell className="px-3">
                    {shortWhen(d)}
                    {isPeak && <Badge variant="warning" className="ml-2 text-[10px]">Peak</Badge>}
                    {isTrough && <Badge variant="success" className="ml-2 text-[10px]">Lowest</Badge>}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums font-medium">
                    {Math.round(d.value).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums text-slate-500">
                    {d.lower != null ? Math.round(d.lower).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums text-slate-500">
                    {d.upper != null ? Math.round(d.upper).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-3 text-right tabular-nums",
                      Math.abs(delta) < 5
                        ? "text-slate-500"
                        : delta > 0
                          ? "text-amber-600"
                          : "text-emerald-600",
                    )}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
        >
          Show {hidden} more days <ChevronDown size={15} />
        </button>
      )}
    </Section>
  );
}
