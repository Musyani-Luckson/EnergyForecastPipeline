import { useNavigate } from "react-router-dom";
import { History, ArrowRight } from "lucide-react";

import type { ForecastSummary } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { relativeTime } from "./portfolio";

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function accuracyBadge(mape: number | null | undefined) {
  if (typeof mape !== "number") return { label: "—", variant: "secondary" as const };
  if (mape <= 10) return { label: `${mape.toFixed(1)}% MAPE`, variant: "success" as const };
  if (mape <= 20) return { label: `${mape.toFixed(1)}% MAPE`, variant: "warning" as const };
  return { label: `${mape.toFixed(1)}% MAPE`, variant: "destructive" as const };
}

/** The most recent forecasts across every dataset, newest first. */
export default function RecentForecasts({ forecasts }: { forecasts: ForecastSummary[] }) {
  const navigate = useNavigate();

  if (!forecasts.length) {
    return (
      <Section icon={History} title="Recent Forecasts" description="Across all datasets.">
        <p className="text-sm text-slate-500">
          No forecasts have been generated yet. Upload a dataset and run it through the pipeline to
          see results here.
        </p>
      </Section>
    );
  }

  return (
    <Section
      icon={History}
      title="Recent Forecasts"
      description="Across all datasets, newest first."
      action={<Badge variant="secondary">{forecasts.length} shown</Badge>}
    >
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-3">Dataset</TableHead>
              <TableHead className="px-3 text-right">Avg daily</TableHead>
              <TableHead className="px-3 text-right">Peak</TableHead>
              <TableHead className="px-3">Accuracy</TableHead>
              <TableHead className="px-3 text-right">Generated</TableHead>
              <TableHead className="px-3 w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {forecasts.map((f) => {
              const values = f.values ?? [];
              const avg = mean(values);
              const peak = values.length ? Math.max(...values) : null;
              const acc = accuracyBadge(f.metrics?.mape);

              return (
                <TableRow
                  key={f.id}
                  onClick={() => navigate(`/datasets/${f.run_id}/forecast`)}
                  className="cursor-pointer"
                >
                  <TableCell className="px-3">
                    <span className="font-medium text-slate-800">
                      {f.dataset_name ?? f.run_id.slice(0, 8)}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      SARIMA({f.order.join(",")})({f.seasonal_order.join(",")})
                    </span>
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums">
                    {avg ? Math.round(avg).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="px-3 text-right tabular-nums text-slate-500">
                    {peak != null ? Math.round(peak).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge variant={acc.variant} className="text-[11px]">
                      {acc.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 text-right text-[11px] text-slate-400 whitespace-nowrap">
                    {relativeTime(f.created_at ?? null)}
                  </TableCell>
                  <TableCell className="px-3">
                    <ArrowRight size={14} className="text-slate-300" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">Demand figures are daily kWh.</p>
    </Section>
  );
}
