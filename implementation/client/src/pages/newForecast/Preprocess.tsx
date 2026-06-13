import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileSpreadsheet,
} from "lucide-react";

type DatasetInfo = {
  fileName: string;
  rows: number;
  warnings?: string[];
};

type PreprocessResult = {
  recordsProcessed: number;
  missingValues: number;
  outliersDetected: number;
  message: string;
};

type PreprocessProps = {
  dataset: DatasetInfo | null;
  onComplete: () => void;
};

function Preprocess({ dataset, onComplete }: PreprocessProps) {
  const [status, setStatus] = useState<
    "IDLE" | "PROCESSING" | "SUCCESS" | "ERROR"
  >("IDLE");

  const [result, setResult] = useState<PreprocessResult | null>(null);

  const handlePreprocess = async () => {
    try {
      setStatus("PROCESSING");

      // Replace with actual API call
      const response = await new Promise<PreprocessResult>((resolve) => {
        setTimeout(() => {
          resolve({
            recordsProcessed: dataset?.rows ?? 0,
            missingValues: 12,
            outliersDetected: 3,
            message: "Dataset successfully cleaned and validated.",
          });
        }, 3000);
      });

      setResult(response);
      setStatus("SUCCESS");

      // unlock next step
      onComplete();
    } catch {
      setStatus("ERROR");
    }
  };

  return (
    <div className="space-y-6">
      {/* Dataset Information */}
      <div className="rounded-lg border border-white/10 bg-gray-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} />
          <h2 className="text-lg font-semibold">Dataset Information</h2>
        </div>

        {dataset ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} />
              <span>{dataset.fileName}</span>
            </div>

            <div>
              <span className="text-white/60">Total Rows:</span>{" "}
              {dataset.rows.toLocaleString()}
            </div>

            {dataset.warnings && dataset.warnings.length > 0 && (
              <div>
                <p className="mb-2 text-amber-400">Warnings</p>

                <ul className="space-y-1">
                  {dataset.warnings.map((warning, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-amber-400 text-xs"
                    >
                      <AlertTriangle size={14} />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-red-400">No dataset available.</p>
        )}
      </div>

      {/* Processing State */}
      {status === "PROCESSING" && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-5">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-blue-500" />

            <div>
              <p className="font-medium">Preprocessing Dataset</p>

              <p className="text-sm text-white/60">
                Cleaning data, validating schema, checking missing values, and
                preparing forecasting inputs...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {status === "SUCCESS" && result && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-5">
          <div className="flex items-center gap-2 text-green-400 mb-4">
            <CheckCircle2 size={18} />
            <span className="font-semibold">Preprocessing Complete</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded border border-white/10 p-3">
              <div className="text-white/50">Records Processed</div>
              <div className="font-semibold">
                {result.recordsProcessed.toLocaleString()}
              </div>
            </div>

            <div className="rounded border border-white/10 p-3">
              <div className="text-white/50">Missing Values</div>
              <div className="font-semibold">{result.missingValues}</div>
            </div>

            <div className="rounded border border-white/10 p-3">
              <div className="text-white/50">Outliers Detected</div>
              <div className="font-semibold">{result.outliersDetected}</div>
            </div>
          </div>

          <p className="mt-4 text-sm text-white/70">{result.message}</p>
        </div>
      )}

      {/* Error State */}
      {status === "ERROR" && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={18} />
            <span>Failed to preprocess dataset.</span>
          </div>
        </div>
      )}

      {/* Action */}
      {status === "IDLE" && (
        <div className="flex justify-end">
          <button
            onClick={handlePreprocess}
            disabled={!dataset}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Preprocessing
          </button>
        </div>
      )}
    </div>
  );
}

export default Preprocess;
