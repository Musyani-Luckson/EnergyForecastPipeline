export type StatusKind = "completed" | "processing" | "ready" | "unavailable";

const STYLES: Record<StatusKind, string> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  processing: "bg-amber-50 text-amber-700 ring-amber-600/20",
  unavailable: "bg-slate-100 text-slate-400 ring-slate-300/40",
};

const LABELS: Record<StatusKind, string> = {
  completed: "Completed",
  ready: "Ready",
  processing: "Processing",
  unavailable: "Not created",
};

export default function StatusBadge({ kind }: { kind: StatusKind }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STYLES[kind]}`}
    >
      {LABELS[kind]}
    </span>
  );
}
