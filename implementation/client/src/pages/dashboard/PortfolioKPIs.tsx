import type { LucideIcon } from "lucide-react";
import { Database, GitBranch, LineChart, Clock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Portfolio } from "./portfolio";

function Kpi({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="px-4 flex items-start gap-3">
        <span className={cn("grid place-items-center size-9 rounded-lg shrink-0", iconClass)}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums leading-tight mt-0.5">
            {value}
          </p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/** Portfolio-level totals: how much data is in the system and how far it got. */
export default function PortfolioKPIs({
  portfolio,
  totalDatasets,
  totalForecasts,
}: {
  portfolio: Portfolio;
  totalDatasets?: number;
  totalForecasts?: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi
        icon={Database}
        iconClass="bg-slate-100 text-slate-600"
        label="Datasets"
        value={(totalDatasets ?? portfolio.total).toLocaleString()}
        sub="uploaded to the system"
      />
      <Kpi
        icon={GitBranch}
        iconClass="bg-blue-50 text-blue-600"
        label="Pipeline runs"
        value={portfolio.total.toLocaleString()}
        sub={`${portfolio.completionPercent.toFixed(0)}% carried through to a forecast`}
      />
      <Kpi
        icon={LineChart}
        iconClass="bg-violet-50 text-violet-600"
        label="Forecasts generated"
        value={(totalForecasts ?? portfolio.completed).toLocaleString()}
        sub="available to review"
      />
      <Kpi
        icon={Clock}
        iconClass={
          portfolio.inProgress > 0
            ? "bg-amber-50 text-amber-600"
            : "bg-emerald-50 text-emerald-600"
        }
        label="Awaiting forecast"
        value={portfolio.inProgress.toLocaleString()}
        sub={portfolio.inProgress > 0 ? "still in preprocessing" : "nothing outstanding"}
      />
    </div>
  );
}
