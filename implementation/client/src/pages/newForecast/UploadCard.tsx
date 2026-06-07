import { useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  FileX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from "lucide-react";

import type {
  FileUploadResult,
  FileUploadStatus,
} from "../../types/fileUpload";

import InputField from "../../components/InputField";

type UploadCardProps = {
  onComplete: (data: FileUploadResult) => void;
};
/* ---------------- config ---------------- */

const ACCEPT = [".csv", ".xlsx", ".xls"];
const MIN_ROWS = 365;
const TIMEOUT_MS = 15000;
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

/* ---------------- component ---------------- */

export default function UploadCard({ onComplete }: UploadCardProps) {
  const [status, setStatus] = useState<FileUploadStatus>("EMPTY");
  const [fileName, setFileName] = useState("File name");
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<FileUploadResult | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file?: File) => {
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    setFileName(file.name);

    if (!ACCEPT.includes(ext)) {
      setStatus("INVALID");
      setResult({
        rows: [],
        warnings: [],
        errors: ["Unsupported file format"],
      });
      return;
    }

    // XLSX/XLS are NOT handled here (needs parser)
    if (ext !== ".csv") {
      setStatus("INVALID");
      setResult({
        rows: [],
        warnings: [],
        errors: ["Only CSV supported in streaming mode"],
      });
      return;
    }

    setStatus("UPLOADING");
    setProgress(0);
    setResult(null);

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
      setStatus("INVALID");
      setResult({
        rows: [],
        warnings: [],
        errors: ["Processing timeout: file too large"],
      });
    }, TIMEOUT_MS);

    let offset = 0;
    let buffer = "";
    const rows: { date: string; value: string }[] = [];

    const reader = new FileReader();

    const readNextChunk = () => {
      if (controller.signal.aborted) return;

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsText(slice);
    };

    reader.onload = (e) => {
      if (controller.signal.aborted) return;

      const chunk = e.target?.result as string;

      offset += CHUNK_SIZE;

      buffer += chunk;

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const [date, value] = line.split(",");
        if (!date || !value) continue;

        rows.push({
          date,
          value,
        });
      }

      const percent = Math.min(100, Math.round((offset / file.size) * 100));

      setProgress(percent);

      if (offset < file.size) {
        readNextChunk();
      } else {
        finish();
      }
    };

    reader.onerror = () => {
      clearTimeout(timeout);
      setStatus("INVALID");
      setResult({
        rows: [],
        warnings: [],
        errors: ["File read failure"],
      });
    };

    const finish = () => {
      clearTimeout(timeout);

      const warnings: string[] = [];
      const errors: string[] = [];

      if (rows.length < MIN_ROWS) {
        warnings.push("Below minimum dataset size");
      }

      const uploadResult = {
        rows,
        warnings,
        errors,
      };

      setResult(uploadResult);
      setStatus("VALID");
      setProgress(100);

      onComplete(uploadResult);
    };

    readNextChunk();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setStatus("EMPTY");
    setFileName("");
    setProgress(0);
    setResult(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="border border-white/10 bg-gray-900 rounded-md p-5">
      <div className="mb-4 text-white/50">
        <h2 className="text-xl font-semibold">Upload dataset</h2>
        <p className="text-xs">streaming CSV parser · large-file safe</p>
      </div>

      <InputField
        name="dataset_name"
        value={fileName}
        placeholder="Dataset name"
        icon={<FileSpreadsheet />}
        onChange={(e) => setFileName(e.target.value)}
      />

      <div className="flex items-center justify-center mt-4">
        {status === "EMPTY" && (
          <DropZone inputRef={inputRef} onFile={handleFile} onDrop={onDrop} />
        )}

        {status === "UPLOADING" && (
          <Uploading fileName={fileName} progress={progress} />
        )}

        {status === "INVALID" && (
          <ErrorState fileName={fileName} onReset={reset} result={result} />
        )}

        {status === "VALID" && <SuccessState result={result} />}
      </div>
    </div>
  );
}

/* ---------------- UI STATES ---------------- */

function DropZone({
  inputRef,
  onFile,
  onDrop,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f?: File) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="w-full h-35 border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/40 transition"
      >
        <Upload className="text-white/50" />
        <p className="text-sm text-white/60">Drop CSV or Excel, or browse</p>
        <p className="text-xs text-white/40">
          streaming parse · large files supported
        </p>
      </div>
    </>
  );
}

function Uploading({
  fileName,
  progress,
}: {
  fileName: string;
  progress: number;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet className="text-blue-400" />
        <span className="text-sm text-white/60">{fileName}</span>
      </div>

      <div className="h-1 bg-white/30 rounded overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-white/60 mt-2">processing… {progress}%</p>
    </div>
  );
}

function ErrorState({
  fileName,
  onReset,
  result,
}: {
  fileName: string;
  onReset: () => void;
  result: FileUploadResult | null;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <FileX className="text-red-400" />
        <span className="text-sm text-white/60">{fileName}</span>
      </div>

      {result?.errors?.length ? (
        result.errors.map((e, i) => (
          <p key={i} className="text-xs text-red-400 flex gap-1">
            <XCircle size={14} /> {e}
          </p>
        ))
      ) : (
        <p className="text-xs text-amber-400 flex gap-1">
          <AlertTriangle size={14} /> Validation failed
        </p>
      )}

      <button
        onClick={onReset}
        className="mt-4 w-full py-2 border border-white/10 rounded-lg text-sm hover:bg-white/5"
      >
        <RefreshCw size={14} className="inline mr-2" />
        Replace file
      </button>
    </div>
  );
}

function SuccessState({ result }: { result: FileUploadResult | null }) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="text-green-400" />
        <span className="text-sm text-green-400">Dataset ready</span>
      </div>

      <div className="text-xs text-white/50">
        {result?.rows?.length} rows loaded
      </div>

      <div className="mt-3 border border-white/10 rounded-lg p-2">
        {result?.rows?.slice(0, 3).map((r, i) => (
          <div
            key={i}
            className="flex justify-between text-xs text-white/60 py-1"
          >
            <span>{r.date}</span>
            <span>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
