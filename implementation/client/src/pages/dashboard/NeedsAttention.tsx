import { useNavigate } from "react-router-dom";
import { ArrowRight, CircleCheckBig, ListTodo } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { stageLabel } from "@/pages/datasets/utils";
import type { Portfolio } from "./portfolio";
import { nextActionFor, relativeTime } from "./portfolio";

const LIMIT = 5;

/**
 * The actionable backlog: datasets that entered the pipeline but never reached
 * a forecast, oldest first, each with the step that would move it forward.
 */
export default function NeedsAttention({ portfolio }: { portfolio: Portfolio }) {
  const navigate = useNavigate();
  const items = portfolio.stalled.slice(0, LIMIT);
  const remaining = portfolio.stalled.length - items.length;

  return (
    <Section
      icon={ListTodo}
      title="Needs Attention"
      description="Datasets that haven’t reached a forecast yet."
      action={
        <Badge variant={portfolio.stalled.length === 0 ? "success" : "warning"}>
          {portfolio.stalled.length === 0 ? "All clear" : `${portfolio.stalled.length} waiting`}
        </Badge>
      }
    >
      {items.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-sm text-emerald-700 font-medium">
          <CircleCheckBig size={15} /> Every dataset has been carried through to a forecast.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {items.map((run) => (
              <li key={run.runId}>
                <button
                  onClick={() => navigate(`/datasets/${run.runId}`)}
                  className="group w-full text-left flex items-center gap-3 py-2.5 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{run.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {nextActionFor(run.stage)} · {run.remaining} step
                      {run.remaining === 1 ? "" : "s"} to a forecast
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="secondary" className="text-[11px]">
                      {stageLabel(run.stage)}
                    </Badge>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {relativeTime(run.updatedAt)}
                    </p>
                  </div>
                  <ArrowRight
                    size={15}
                    className="text-slate-300 group-hover:text-slate-600 transition shrink-0"
                  />
                </button>
              </li>
            ))}
          </ul>

          {remaining > 0 && (
            <button
              onClick={() => navigate("/datasets")}
              className="mt-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              View {remaining} more
            </button>
          )}
        </>
      )}
    </Section>
  );
}
