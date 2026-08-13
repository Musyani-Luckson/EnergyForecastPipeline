import { Droplets } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { MissingValuesData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Section, Stat } from "./Section";
import { int, pct } from "./format";

/** Section 4 — how much data is absent, and which columns carry it. */
export default function MissingValues({ data }: { data: MissingValuesData }) {
  const clean = data.total_missing === 0;

  // Share of cells present vs missing — the donut is drawn from real counts.
  const present = Math.max(0, 100 - data.missing_percentage);
  const chartData = [
    { name: "Present", value: present, fill: "#10b981" },
    { name: "Missing", value: data.missing_percentage, fill: "#f43f5e" },
  ];

  const columns = Object.entries(data.column_missing).filter(([, n]) => n > 0);

  return (
    <Section
      icon={Droplets}
      title="Missing Value Analysis"
      description="Null cells across the dataset and the columns they fall in."
      action={
        <Badge variant={clean ? "success" : "warning"}>
          {clean ? "No missing values" : `${int(data.total_missing)} missing`}
        </Badge>
      }
    >
      <div className="flex items-center gap-6 flex-wrap">
        <div className="relative size-[120px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                innerRadius={40}
                outerRadius={58}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <p
                className={`text-lg font-bold tabular-nums ${
                  clean ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {pct(data.missing_percentage)}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">missing</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-[240px] grid grid-cols-2 gap-2.5">
          <Stat label="Total missing" value={int(data.total_missing)} hint="null cells" />
          <Stat label="Missing rate" value={pct(data.missing_percentage)} hint="of all cells" />
          <Stat label="Affected rows" value={int(data.affected_rows)} hint="rows with any null" />
          <Stat label="Affected rate" value={pct(data.affected_row_percentage)} hint="of all rows" />
        </div>
      </div>

      {columns.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3">Column</TableHead>
                <TableHead className="px-3 text-right">Missing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map(([name, count]) => (
                <TableRow key={name}>
                  <TableCell className="px-3 font-mono text-xs">{name}</TableCell>
                  <TableCell className="px-3 text-right tabular-nums font-medium text-rose-600">
                    {int(count)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  );
}
