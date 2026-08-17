import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Factory, LineChart, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";

const fullDate = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;

function Tile({
  icon: Icon,
  iconClass,
  label,
  value,
  unit,
  sub,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
  unit?: string;
  sub?: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 flex items-start gap-3">
      <span className={cn("grid place-items-center size-8 rounded-lg shrink-0", iconClass)}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
        <p className="text-lg font-bold text-slate-900 tabular-nums leading-tight mt-0.5">
          {value}
          {unit && <span className="text-[11px] font-medium text-slate-400 ml-1">{unit}</span>}
        </p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/** The six headline figures of the forecast, as in the results design. */
export default function ForecastSummaryCard({ insights }: { insights: ForecastInsights }) {
  const n = (v: number) => Math.round(v * 100) / 100;

  const upperMax = insights.days.reduce<number | null>(
    (a, d) => (d.upper != null ? (a == null || d.upper > a ? d.upper : a) : a),
    null,
  );
  const lowerMin = insights.days.reduce<number | null>(
    (a, d) => (d.lower != null ? (a == null || d.lower < a ? d.lower : a) : a),
    null,
  );

  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Forecast Summary</h2>

        <div className="grid sm:grid-cols-2 gap-2.5">
          <Tile
            icon={LineChart}
            iconClass="bg-blue-50 text-blue-600"
            label={`Average Forecast (${insights.horizon} Days)`}
            value={n(insights.average).toLocaleString()}
            unit="kWh"
          />
          <Tile
            icon={Factory}
            iconClass="bg-violet-50 text-violet-600"
            label={`Total Forecast (${insights.horizon} Days)`}
            value={n(insights.total).toLocaleString()}
            unit="kWh"
          />
          <Tile
            icon={TrendingUp}
            iconClass="bg-rose-50 text-rose-600"
            label="Peak Forecast"
            value={insights.peak ? n(insights.peak.value).toLocaleString() : "-"}
            unit="kWh"
            sub={insights.peak?.date ? `On ${fullDate(insights.peak.date)}` : null}
          />
          <Tile
            icon={TrendingDown}
            iconClass="bg-emerald-50 text-emerald-600"
            label="Lowest Forecast"
            value={insights.trough ? n(insights.trough.value).toLocaleString() : "-"}
            unit="kWh"
            sub={insights.trough?.date ? `On ${fullDate(insights.trough.date)}` : null}
          />
          <Tile
            icon={ArrowUpRight}
            iconClass="bg-sky-50 text-sky-600"
            label="Upper 95% CI (Max)"
            value={upperMax != null ? n(upperMax).toLocaleString() : "-"}
            unit="kWh"
          />
          <Tile
            icon={ArrowDownRight}
            iconClass="bg-slate-100 text-slate-600"
            label="Lower 95% CI (Min)"
            value={lowerMin != null ? n(lowerMin).toLocaleString() : "-"}
            unit="kWh"
          />
        </div>
      </CardContent>
    </Card>
  );
}
