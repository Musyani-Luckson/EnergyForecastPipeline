import { ArrowDown, FileSearch, FileDown, LineChart } from "lucide-react";
import type { Pipeline, VersionNode } from "../../../api/datasetsAPI";
import { STAGES } from "../utils";
import VersionCard from "./VersionCard";
import ActionButton from "./ActionButton";

interface VersionTimelineProps {
  pipeline: Pipeline;
  /** Forecast id enabling "Generate Report" on the FORECAST version (or null). */
  forecastResultId: number | null;
  exporting: boolean;
  onViewAnalysis: (node: VersionNode) => void;
  onViewForecast: () => void;
  onGenerateReport: () => void;
}

/**
 * The dataset's full processing history in order. Owns the per-stage action
 * rules; VersionCard/ActionButton stay presentational.
 *  - View Analysis → quality report (every stage except FORECAST).
 *  - View Forecast → the decision-support dashboard (FORECAST stage only).
 *  - Generate Report → only the FORECAST stage (the sole backend report endpoint).
 */
export default function VersionTimeline({
  pipeline, forecastResultId, exporting, onViewAnalysis, onViewForecast, onGenerateReport,
}: VersionTimelineProps) {
  return (
    <div>
      {STAGES.map((meta, i) => {
        const node = pipeline[meta.key];
        const isForecast = meta.key === "FORECAST";

        const actions = node ? (
          <>
            {isForecast ? (
              <ActionButton
                label="View Forecast"
                icon={<LineChart size={13} />}
                onClick={onViewForecast}
              />
            ) : (
              <ActionButton
                label="View Analysis"
                icon={<FileSearch size={13} />}
                onClick={() => onViewAnalysis(node)}
              />
            )}
            <ActionButton
              label="Generate Report"
              icon={<FileDown size={13} />}
              primary
              onClick={isForecast && forecastResultId ? onGenerateReport : undefined}
              disabled={!isForecast || !forecastResultId}
              busy={isForecast && exporting}
              hint={
                isForecast
                  ? "No forecast result is available yet."
                  : "Report generation is available for the forecast stage."
              }
            />
          </>
        ) : undefined;

        return (
          <div key={meta.key}>
            <VersionCard meta={meta} node={node} index={i} actions={actions} />
            {i < STAGES.length - 1 && (
              <div className="flex justify-center py-1.5">
                <ArrowDown size={16} className={node ? "text-slate-300" : "text-slate-200"} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
