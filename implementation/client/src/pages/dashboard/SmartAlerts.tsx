import { Bell, CircleCheck, TriangleAlert, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { cn } from "@/lib/utils";
import type { ForecastInsights } from "./insights";
import { smartAlerts, type Tone } from "./narrative";

const ICON: Record<Tone, typeof CircleCheck> = {
  good: CircleCheck,
  watch: TriangleAlert,
  risk: CircleAlert,
};

const COLOUR: Record<Tone, string> = {
  good: "text-emerald-600",
  watch: "text-amber-600",
  risk: "text-rose-600",
};

/** Conditions that would warrant telling someone, generated from the forecast. */
export default function SmartAlerts({
  insights,
  generatedAt,
}: {
  insights: ForecastInsights;
  generatedAt?: string;
}) {
  const alerts = smartAlerts(insights);
  const active = alerts.filter((a) => a.tone !== "good").length;

  return (
    <Section
      icon={Bell}
      title="Alerts"
      description="Conditions worth flagging before you plan."
      action={
        <Badge variant={active === 0 ? "success" : "warning"}>
          {active === 0 ? "All clear" : `${active} active`}
        </Badge>
      }
    >
      <ul className="divide-y divide-slate-100">
        {alerts.map((a, i) => {
          const Icon = ICON[a.tone];
          return (
            <li key={i} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <Icon size={15} className={cn("mt-0.5 shrink-0", COLOUR[a.tone])} />
              <span className="text-sm text-slate-700">{a.text}</span>
            </li>
          );
        })}
      </ul>

      {generatedAt && (
        <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
          Forecast generated{" "}
          {new Date(generatedAt).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          .
        </p>
      )}
    </Section>
  );
}
