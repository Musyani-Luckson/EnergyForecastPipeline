import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export interface ActionButtonProps {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Tooltip shown when disabled (explains why). */
  hint?: string;
  busy?: boolean;
  primary?: boolean;
}

export default function ActionButton({
  label, icon, onClick, disabled, hint, busy, primary,
}: ActionButtonProps) {
  const tone = primary
    ? "bg-blue-700 hover:bg-blue-800 text-white"
    : "border border-slate-200 hover:border-slate-300 text-slate-600";

  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      title={disabled ? hint : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${tone}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
