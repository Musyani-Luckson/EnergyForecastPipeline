import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CircularGauge from "@/pages/report/CircularGauge";
import { cn } from "@/lib/utils";
import type { ForecastInsights, Verdict } from "./insights";

interface VerdictStyle {
  icon: typeof ShieldCheck;
  dot: string;
  text: string;
  ring: string;
  card: string;
  badge: "success" | "warning" | "destructive";
}

const VERDICT: Record<Verdict, VerdictStyle> = {
  RELIABLE: {
    icon: ShieldCheck,
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    ring: "text-emerald-500",
    card: "border-emerald-200 bg-emerald-50/40",
    badge: "success",
  },
  "USE WITH CARE": {
    icon: ShieldAlert,
    dot: "bg-amber-500",
    text: "text-amber-600",
    ring: "text-amber-500",
    card: "border-amber-200 bg-amber-50/40",
    badge: "warning",
  },
  UNRELIABLE: {
    icon: ShieldX,
    dot: "bg-rose-500",
    text: "text-rose-600",
    ring: "text-rose-500",
    card: "border-rose-200 bg-rose-50/40",
    badge: "destructive",
  },
};

function Facet({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("text-base font-bold mt-0.5 text-slate-900", tone)}>{value}</p>
    </div>
  );
}

/**
 * The first question a manager has is not "what did the model predict?" but
 * "can I trust this?". This answers that before anything else on the page.
 */
export default function ForecastHealth({ insights }: { insights: ForecastInsights }) {
  const v = VERDICT[insights.verdict];
  const Icon = v.icon;

  return (
    <Card className={cn("py-6", v.card)}>
      <CardContent className="flex items-center gap-7 flex-wrap">
        {insights.confidencePercent != null ? (
          <CircularGauge value={insights.confidencePercent} size={128} thickness={11} tone={v.ring}>
            <div className="text-center">
              <p className={cn("text-2xl font-bold leading-none", v.text)}>
                {insights.confidencePercent.toFixed(0)}%
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">confidence</p>
            </div>
          </CircularGauge>
        ) : (
          <div className={cn("grid place-items-center size-[128px] rounded-full border-4", v.text)}>
            <Icon size={40} />
          </div>
        )}

        <div className="flex-1 min-w-[280px]">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Forecast health</p>
          <div className="flex items-center gap-2.5 mt-1">
            <span className={cn("size-2.5 rounded-full", v.dot)} />
            <p className={cn("text-2xl font-bold", v.text)}>{insights.verdict}</p>
            <Badge variant={v.badge} className="gap-1">
              <Icon size={12} /> {insights.overallRisk} RISK
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-4">
            <Facet
              label="Data quality"
              value={
                insights.dataQualityPercent != null ? `${insights.dataQualityPercent}%` : "N/A"
              }
            />
            <Facet label="Model quality" value={insights.modelAccuracy?.label ?? "N/A"} />
            <Facet
              label="Expected accuracy"
              value={
                insights.modelAccuracy
                  ? insights.modelAccuracy.tone === "LOW"
                    ? "High"
                    : insights.modelAccuracy.tone === "MEDIUM"
                      ? "Moderate"
                      : "Low"
                  : "N/A"
              }
            />
            <Facet label="Horizon" value={`${insights.horizon} days`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
