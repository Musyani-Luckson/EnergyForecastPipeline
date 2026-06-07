import { LineChart, Eye, Download, RefreshCw } from "lucide-react";
import type { Forecast } from "../../types/forecast";

interface ForecastCardProps {
  forecast: Forecast;
  onView?: (forecast: Forecast) => void;
  onExport?: (forecast: Forecast) => void;
}

const STATUS_STYLES: Record<Forecast["status"], string> = {
  COMPLETED: "bg-emerald-500/15 text-emerald-400",
  PENDING: "bg-amber-500/15 text-amber-400",
  FAILED: "bg-rose-500/15 text-rose-400",
};

function ForecastCard({ forecast, onView, onExport }: ForecastCardProps) {
  const { name, createdAt, status } = forecast;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-300 px-3 py-3">
      {/* Icon */}
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#16294d]">
        <LineChart className="h-5 w-5 text-sky-400" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-100">
          {name}
        </p>

        <p className="truncate text-xs text-neutral-400">
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>

      {/* Status */}
      <span
        className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[status]}`}
      >
        {status}
      </span>

      {/* Actions */}
      {status === "PENDING" ? (
        <RefreshCw className="h-[18px] w-[18px] shrink-0 animate-spin text-amber-400" />
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onView?.(forecast)}
            aria-label="View forecast"
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
          >
            <Eye className="h-[18px] w-[18px]" />
          </button>

          <button
            onClick={() => onExport?.(forecast)}
            aria-label="Export forecast"
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-200"
          >
            <Download className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ForecastCard;
