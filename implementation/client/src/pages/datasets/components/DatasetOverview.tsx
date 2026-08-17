import type { PipelineRun } from "../../../api/datasetsAPI";
import {
  currentStage, datasetName, fmtDate, fmtDateTime, latestUpdate, stageLabel, uploadDate,
} from "../utils";

function Tile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-medium text-slate-800 mt-1 break-words ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}

/** General information about the selected dataset - backend data only. */
export default function DatasetOverview({ run }: { run: PipelineRun }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <Tile label="Filename" value={datasetName(run)} />
      <Tile label="Upload date" value={fmtDate(uploadDate(run))} />
      <Tile label="Current stage" value={stageLabel(currentStage(run.pipeline))} />
      <Tile label="Run identifier" value={run.run_id} mono />
      <Tile label="Latest update" value={fmtDateTime(latestUpdate(run))} />
    </div>
  );
}
