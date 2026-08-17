import type { ReactNode } from "react";
import { FileText } from "lucide-react";

import type { DatasetOverviewData } from "@/api/datasetsAPI";
import { Badge } from "@/components/ui/badge";
import { shortDate } from "./format";

interface ReportHeaderProps {
  /** Dataset/file name this report describes. */
  title: string;
  /** Pipeline stage or other qualifier, e.g. "Post-cleaning assessment". */
  subtitle?: string;
  overview: DatasetOverviewData;
  /** Export buttons or other page-level actions. */
  actions?: ReactNode;
}

/** Title block for the quality report - identity and span of what was analysed. */
export default function ReportHeader({ title, subtitle, overview, actions }: ReportHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <span className="grid place-items-center size-10 rounded-xl bg-blue-50 text-blue-600 shrink-0">
          <FileText size={19} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight break-words">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge variant="outline" className="text-[11px]">
              {shortDate(overview.start_date)} - {shortDate(overview.end_date)}
            </Badge>
            <Badge variant="outline" className="text-[11px]">
              {overview.rows.toLocaleString()} records
            </Badge>
          </div>
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
