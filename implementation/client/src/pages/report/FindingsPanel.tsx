import { useMemo } from "react";
import { CircleCheck, CircleX, ClipboardList, TriangleAlert } from "lucide-react";

import type { QualityReport } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { Section } from "./Section";
import { deriveFindings } from "./findings";
import { cn } from "@/lib/utils";

const ICON = { pass: CircleCheck, warn: TriangleAlert, fail: CircleX };
const COLOUR = { pass: "text-emerald-600", warn: "text-amber-600", fail: "text-rose-600" };

/** Plain-language summary of every quality dimension in the report. */
export default function FindingsPanel({ report }: { report: QualityReport }) {
  const findings = useMemo(() => deriveFindings(report), [report]);
  const problems = findings.filter((f) => f.tone !== "pass").length;

  return (
    <Section
      icon={ClipboardList}
      title="Findings"
      description="What the analysis means, in plain language."
      action={
        <Badge variant={problems === 0 ? "success" : "warning"}>
          {problems === 0 ? "All checks passed" : `${problems} to review`}
        </Badge>
      }
    >
      <ul className="space-y-1.5">
        {findings.map((f, i) => {
          const Icon = ICON[f.tone];
          return (
            <li key={`${f.tone}-${i}`} className="flex items-start gap-2.5 text-sm text-slate-700">
              <Icon size={15} className={cn("mt-0.5 shrink-0", COLOUR[f.tone])} />
              <span>{f.text}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
