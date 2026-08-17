import { CircleCheckBig, TriangleAlert } from "lucide-react";

import type { ForecastingReadinessData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CircularGauge from "./CircularGauge";
import { READINESS_RECOMMENDATION, readinessStatus, type ReadinessStatus } from "./readiness";
import { cn } from "@/lib/utils";

const TONE: Record<ReadinessStatus, { text: string; ring: string; card: string; badge: "success" | "warning" | "destructive" }> = {
  READY: {
    text: "text-emerald-600",
    ring: "text-emerald-500",
    card: "border-emerald-200 bg-emerald-50/40",
    badge: "success",
  },
  REVIEW: {
    text: "text-amber-600",
    ring: "text-amber-500",
    card: "border-amber-200 bg-amber-50/40",
    badge: "warning",
  },
  "NOT READY": {
    text: "text-rose-600",
    ring: "text-rose-500",
    card: "border-rose-200 bg-rose-50/40",
    badge: "destructive",
  },
};

/** Section 15 - the hero verdict for the whole report. */
export default function ForecastReadiness({ data }: { data: ForecastingReadinessData }) {
  const status = readinessStatus(data);
  const tone = TONE[status];

  return (
    <Card className={cn("py-6", tone.card)}>
      <CardContent className="flex items-center gap-7 flex-wrap">
        <CircularGauge value={data.score} size={132} thickness={11} tone={tone.ring}>
          <div className="text-center">
            <p className={cn("text-3xl font-bold leading-none", tone.text)}>{data.grade}</p>
            <p className="text-xs font-medium tabular-nums text-slate-500 mt-1">{data.score}/100</p>
          </div>
        </CircularGauge>

        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Forecast readiness</p>
            <Badge variant={tone.badge} className="gap-1">
              {status === "READY" ? <CircleCheckBig size={12} /> : <TriangleAlert size={12} />}
              {status}
            </Badge>
          </div>

          <p className={cn("text-2xl font-bold mt-1", tone.text)}>
            Grade {data.grade} - {data.score}%
          </p>

          <p className="text-sm text-slate-600 mt-2">{READINESS_RECOMMENDATION[status]}</p>

          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
              Issues found
            </p>
            {data.issues.length === 0 ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                <CircleCheckBig size={14} /> None
              </p>
            ) : (
              <ul className="space-y-1">
                {data.issues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2 text-sm text-slate-700">
                    <TriangleAlert size={13} className="mt-0.5 shrink-0 text-amber-500" />
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
