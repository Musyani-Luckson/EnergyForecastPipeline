import { Coins, Info } from "lucide-react";

import { Section, Stat, StatGrid } from "@/pages/report/Section";
import type { ForecastInsights } from "./insights";

/**
 * Consumption is derivable today; tariff and emissions factors are not held
 * anywhere in the system, so those read N/A rather than carrying a guessed
 * rate. The component is shaped to fill in once a tariff source exists.
 */
export default function CostImpact({ insights }: { insights: ForecastInsights }) {
  const mwh = insights.total / 1000;

  return (
    <Section
      icon={Coins}
      title="Cost & Carbon Impact"
      description={`Projected over the ${insights.horizon}-day horizon.`}
    >
      <StatGrid>
        <Stat
          label="Estimated consumption"
          value={mwh >= 1 ? `${mwh.toFixed(1)} MWh` : `${Math.round(insights.total)} kWh`}
          hint="sum of the forecast"
        />
        <Stat label="Estimated cost" value="N/A" hint="no tariff configured" tone="text-slate-400" />
        <Stat
          label="Potential savings"
          value="N/A"
          hint="needs tariff + baseline"
          tone="text-slate-400"
        />
        <Stat
          label="Carbon emissions"
          value="N/A"
          hint="no grid factor configured"
          tone="text-slate-400"
        />
      </StatGrid>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mt-3">
        <Info size={12} className="mt-0.5 shrink-0" />
        Consumption is derived from the forecast. Cost, savings and emissions need a tariff rate
        and a grid carbon factor, neither of which the system stores yet.
      </p>
    </Section>
  );
}
