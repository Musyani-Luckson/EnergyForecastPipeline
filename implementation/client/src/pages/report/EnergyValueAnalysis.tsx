import { ShieldCheck, ShieldAlert } from "lucide-react";

import type { EnergyValueAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section } from "./Section";
import { int } from "./format";
import { cn } from "@/lib/utils";

function ValidationCard({
  label,
  count,
  ok,
  explanation,
}: {
  label: string;
  count: number;
  ok: boolean;
  explanation: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        ok ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        {ok ? (
          <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
        ) : (
          <ShieldAlert size={15} className="text-amber-600 shrink-0" />
        )}
      </div>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums mt-1",
          ok ? "text-emerald-700" : "text-amber-700",
        )}
      >
        {int(count)}
      </p>
      <p className="text-[11px] text-slate-500 mt-0.5">{explanation}</p>
    </div>
  );
}

/** Section 8 - physical plausibility of the energy readings. */
export default function EnergyValueAnalysis({ data }: { data: EnergyValueAnalysisData }) {
  // A differenced version measures change between consecutive periods, so the
  // non-negativity rule does not apply to it: a negative entry is a fall in
  // demand, not an impossible meter reading.
  const differenced = data.is_differenced === true;

  return (
    <Section
      icon={data.is_energy_data_valid ? ShieldCheck : ShieldAlert}
      title="Energy Data Validation"
      description={
        differenced
          ? "This version holds period-over-period change, so negative entries are expected decreases in demand."
          : "Readings that are physically implausible for metered consumption."
      }
      action={
        <Badge variant={data.is_energy_data_valid ? "success" : "warning"}>
          {differenced ? "Differenced series" : data.is_energy_data_valid ? "Valid" : "Needs review"}
        </Badge>
      }
    >
      <div className="grid sm:grid-cols-3 gap-2.5">
        <ValidationCard
          label={differenced ? "Decreases" : "Negative values"}
          count={data.negative_values_count}
          ok={differenced || !data.has_negative_values}
          explanation={
            differenced
              ? "Periods where demand fell - expected here"
              : "Consumption cannot be below zero"
          }
        />
        <ValidationCard
          label="Zero values"
          count={data.zero_values_count}
          ok={!data.has_zero_values}
          explanation="May indicate an outage or a failed meter read"
        />
        <div
          className={cn(
            "rounded-lg border px-4 py-3 flex flex-col justify-center",
            data.is_energy_data_valid
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-amber-200 bg-amber-50/50",
          )}
        >
          <p className="text-xs font-medium text-slate-600">Overall integrity</p>
          <p
            className={cn(
              "text-lg font-bold mt-1",
              data.is_energy_data_valid ? "text-emerald-700" : "text-amber-700",
            )}
          >
            {data.is_energy_data_valid ? "Passed" : "Flagged"}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {differenced
              ? "Change values - the non-negative rule does not apply"
              : data.is_energy_data_valid
                ? "All readings are plausible"
                : "Some readings need investigation"}
          </p>
        </div>
      </div>
    </Section>
  );
}
