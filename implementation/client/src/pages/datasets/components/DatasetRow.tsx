import { ChevronRight, Database } from "lucide-react";
import type { PipelineRun } from "../../../api/datasetsAPI";
import { currentStage, datasetName, fmtDate, runStatus, uploadDate } from "../utils";
import StageBadge from "./StageBadge";
import StatusBadge from "./StatusBadge";

interface DatasetRowProps {
  run: PipelineRun;
  onOpen: () => void;
}

/** A single dataset in the list - summary only, no pipeline graphic. */
export default function DatasetRow({ run, onOpen }: DatasetRowProps) {
  return (
    <button
      onClick={onOpen}
      className="group w-full text-left rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition px-5 py-4 flex items-center gap-4"
    >
      <div className="h-10 w-10 rounded-lg bg-slate-100 grid place-items-center shrink-0">
        <Database size={18} className="text-slate-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 truncate">{datasetName(run)}</span>
          <StageBadge stage={currentStage(run.pipeline)} />
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Uploaded {fmtDate(uploadDate(run))} ·{" "}
          <span className="font-mono">{run.run_id.slice(0, 8)}</span>
        </p>
      </div>

      <StatusBadge kind={runStatus(run.pipeline)} />
      <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition shrink-0" />
    </button>
  );
}
