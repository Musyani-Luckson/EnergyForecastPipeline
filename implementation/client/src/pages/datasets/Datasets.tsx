import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Loader2, AlertTriangle, RefreshCw, Upload } from "lucide-react";
import { usePipelineRuns } from "./hooks/usePipelineRuns";
import { useDatasetUpload } from "./hooks/useDatasetUpload";
import DatasetRow from "./components/DatasetRow";
import { uploadDate } from "./utils";

export default function Datasets() {
  const navigate = useNavigate();
  const { runs, loading, error, refresh } = usePipelineRuns();
  const { upload, uploading, error: uploadError } = useDatasetUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...runs].sort(
    (a, b) =>
      new Date(uploadDate(b) ?? 0).getTime() - new Date(uploadDate(a) ?? 0).getTime(),
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    const result = await upload(file);
    if (result) {
      // Skip any success screen — land straight in the RAW analysis.
      navigate(`/datasets/${result.run_id}/versions/${result.id}`);
    }
  };

  return (
    <div className="px-8 py-7">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Datasets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Uploaded datasets and their processing history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh"
            className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition disabled:opacity-40"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 shadow-sm transition disabled:opacity-60"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Uploading…" : "Upload dataset"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </div>

      {(error || uploadError) && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">{uploadError ?? error}</p>
          {error && !uploadError && (
            <button onClick={refresh} className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900">
              Retry
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
          <Loader2 size={18} className="animate-spin" /> <span className="text-sm">Loading datasets…</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-24 flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-xl bg-slate-100 grid place-items-center">
            <Database className="h-5 w-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">No datasets yet</p>
          <p className="text-xs text-slate-400">Upload a CSV to create your first dataset.</p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2.5 disabled:opacity-60"
          >
            <Upload size={15} /> Upload dataset
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((run) => (
            <DatasetRow
              key={run.run_id}
              run={run}
              onOpen={() => navigate(`/datasets/${run.run_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
