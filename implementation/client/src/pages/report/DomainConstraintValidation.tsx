import { ShieldCheck, ShieldAlert } from "lucide-react";

import type { EnergyValueAnalysisData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section, Stat, StatGrid } from "./Section";
import { int } from "./format";
import {
  APPLIED_STRATEGY, STRATEGY_DETAIL, STRATEGY_LABEL, type ConstraintStrategy,
} from "./constraints";

interface DomainConstraintValidationProps {
  /** Energy validation for the version this report describes. */
  data: EnergyValueAnalysisData;
  /**
   * Physically invalid readings present at the previous checkpoint. Derived by
   * the caller from the prior report, since a single report only describes one
   * version and can't know what the transformation corrected.
   */
  corrected: number;
  strategy?: ConstraintStrategy;
}

/**
 * Reports the domain constraint the pipeline enforces: electricity consumption
 * cannot be negative, so readings below zero are treated as anomalies and
 * imputed alongside statistical outliers.
 *
 * Rendered only when the constraint actually did something - most datasets
 * carry no invalid readings and never see this panel.
 */
export default function DomainConstraintValidation({
  data,
  corrected,
  strategy = APPLIED_STRATEGY,
}: DomainConstraintValidationProps) {
  const remaining = data.negative_values_count;
  const passed = remaining === 0;

  return (
    <Section
      icon={passed ? ShieldCheck : ShieldAlert}
      title="Domain Constraint Validation"
      description="Enforcement of physical limits on metered consumption."
      action={<Badge variant={passed ? "success" : "destructive"}>{passed ? "PASSED" : "FAILED"}</Badge>}
    >
      <StatGrid cols={3}>
        <Stat
          label="Invalid values corrected"
          value={int(corrected)}
          hint="negative readings"
          tone={corrected > 0 ? "text-blue-600" : undefined}
        />
        <Stat label="Correction strategy" value={STRATEGY_LABEL[strategy]} />
        <Stat
          label="Remaining"
          value={int(remaining)}
          hint={passed ? "constraint satisfied" : "still invalid"}
          tone={passed ? "text-emerald-600" : "text-rose-600"}
        />
      </StatGrid>

      <p className="text-xs text-slate-500 mt-3">
        Electricity consumption cannot be negative. {STRATEGY_DETAIL[strategy]}
      </p>
    </Section>
  );
}
