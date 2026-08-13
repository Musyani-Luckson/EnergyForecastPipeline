import type { ReactNode } from "react";
import { Check, CircleDashed } from "lucide-react";
import type { VersionNode } from "../../../api/datasetsAPI";
import type { StageMeta } from "../utils";
import { fmtDateTime } from "../utils";
import StatusBadge from "./StatusBadge";

interface VersionCardProps {
  meta: StageMeta;
  node: VersionNode | null;
  index: number;
  /** Action buttons for an existing version (composed by the parent). */
  actions?: ReactNode;
}

/** Presentational card for a single dataset version (present or not-yet-created). */
export default function VersionCard({ meta, node, index, actions }: VersionCardProps) {
  const exists = Boolean(node);

  return (
    <div
      className={`rounded-xl border px-5 py-4 transition-colors ${
        exists ? "border-slate-200 bg-white" : "border-dashed border-slate-200 bg-slate-50/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-9 w-9 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${
              exists ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
            }`}
          >
            {exists ? <Check size={15} strokeWidth={3} /> : index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
            <p className="text-xs text-slate-400">{meta.description}</p>
          </div>
        </div>
        <StatusBadge kind={exists ? "ready" : "unavailable"} />
      </div>

      {exists && node ? (
        <div className="mt-3 pl-12 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs text-slate-500">Created {fmtDateTime(node.created_at)}</span>
          <span className="font-mono text-[11px] text-slate-400">#{node.id}</span>
          {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
        </div>
      ) : (
        <p className="mt-3 pl-12 text-xs text-slate-400 flex items-center gap-1.5">
          <CircleDashed size={13} /> This version has not been created yet.
        </p>
      )}
    </div>
  );
}
