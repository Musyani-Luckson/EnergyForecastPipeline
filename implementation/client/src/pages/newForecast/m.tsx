import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Lock,
  FileSpreadsheet,
  FileX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";

/*
  UploadStep — Step 1 of the New Forecast wizard.

  One card, four states, no page jump. The drop-zone region is a fixed
  footprint that swaps its contents as `status` advances:
    empty      -> dashed drop zone
    uploading  -> filename + progress bar
    invalid    -> error / warning list  (hard errors block)
    valid      -> row preview + summary (Continue enabled)

  Validation runs in two places by design:
    - client-side here for instant feedback (format, parse, structure)
    - server-side on Continue (authoritative; the client "valid" is provisional)

  Tailwind for all styling. The only inline style is the dynamic progress width.
  Colors are explicit dark-palette utilities (no `dark:` variants) to match the app.
*/

const MIN_ROWS = 48; // soft threshold: quartiles get unreliable below this
const ACCEPT = [".csv", ".xlsx", ".xls"];

// --- lightweight CSV parser (date,value). Swap for PapaParse in production. ---
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const first = lines[0].split(",");
  const hasHeader = first.length >= 2 && isNaN(parseFloat(first[1]));
  const headers = hasHeader ? first.map((h) => h.trim()) : ["date", "value"];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const rows = dataLines.map((line, i) => {
    const cols = line.split(",");
    return {
      n: i + 1 + (hasHeader ? 1 : 0),
      date: (cols[0] || "").trim(),
      raw: (cols[1] ?? "").trim(),
    };
  });
  return { headers, rows };
}

// --- validation: hard errors block, soft warnings allow Continue ---
function validate(rows) {
  const hardErrors = [];
  const warnings = [];
  const seen = new Map();
  let missing = 0;

  rows.forEach((r) => {
    if (r.raw === "") {
      missing += 1;
      return;
    }
    const val = parseFloat(r.raw);
    if (isNaN(val)) hardErrors.push(`Non-numeric value in row ${r.n}`);
    else if (val < 0) hardErrors.push(`Negative consumption in row ${r.n}`);
    if (r.date === "" || isNaN(Date.parse(r.date)))
      hardErrors.push(`Unparseable timestamp in row ${r.n}`);
    if (seen.has(r.date)) seen.get(r.date).push(r.n);
    else seen.set(r.date, [r.n]);
  });

  const dupRows = [...seen.values()].filter((a) => a.length > 1);
  if (dupRows.length > 0) {
    const sample = dupRows.flat().slice(0, 6).join(", ");
    hardErrors.push(`${dupRows.length} duplicate timestamps (rows ${sample})`);
  }
  if (missing > 0)
    warnings.push(
      `${missing} missing values — will be imputed in preprocessing`,
    );
  if (rows.length < MIN_ROWS)
    warnings.push(`${rows.length} rows — below ${MIN_ROWS} minimum`);

  return {
    hardErrors: hardErrors.slice(0, 8),
    warnings,
    rowCount: rows.length,
    duplicateCount: dupRows.length,
    preview: rows.slice(0, 10),
  };
}

export default function UploadStep({ onContinue }) {
  const [status, setStatus] = useState("empty"); // empty | uploading | valid | invalid
  const [datasetName, setDatasetName] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const inputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPT.includes(ext)) {
      setFileName(file.name);
      setResult({
        hardErrors: ["Unsupported format — upload CSV or Excel"],
        warnings: [],
        rowCount: 0,
        duplicateCount: 0,
        preview: [],
      });
      setStatus("invalid");
      return;
    }

    setFileName(file.name);
    setServerError("");
    setStatus("uploading");
    setProgress(0);

    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(100, p + 22);
      setProgress(p);
      if (p >= 100) clearInterval(tick);
    }, 90);

    const reader = new FileReader();
    reader.onload = () => {
      // NOTE: Excel (.xlsx/.xls) needs SheetJS; this path parses CSV.
      const text = String(reader.result || "");
      const { rows } = parseCsv(text);
      const res = validate(rows);
      setResult(res);
      setTimeout(() => {
        clearInterval(tick);
        setProgress(100);
        setStatus(res.hardErrors.length > 0 ? "invalid" : "valid");
      }, 450);
    };
    reader.onerror = () => {
      clearInterval(tick);
      setResult({
        hardErrors: ["Could not read file"],
        warnings: [],
        rowCount: 0,
        duplicateCount: 0,
        preview: [],
      });
      setStatus("invalid");
    };
    reader.readAsText(file);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setStatus("empty");
    setFileName("");
    setProgress(0);
    setResult(null);
    setServerError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleContinue = async () => {
    if (status !== "valid" || submitting) return;
    setSubmitting(true);
    setServerError("");
    try {
      // SERVER: authoritative validation + persistence.
      // const form = new FormData();
      // form.append("datasetName", datasetName);
      // form.append("file", fileRef.current);
      // const res = await fetch("/api/datasets/upload", { method: "POST", body: form });
      // if (!res.ok) throw new Error("Dataset validation failed");
      // const { datasetId } = await res.json();
      const datasetId = "DS001"; // placeholder until wired
      onContinue?.({ datasetId, datasetName });
    } catch (err) {
      setServerError(err.message || "Upload failed");
      setStatus("invalid");
      setResult((r) => ({
        ...(r || { warnings: [], rowCount: 0, duplicateCount: 0, preview: [] }),
        hardErrors: [err.message || "Server rejected the dataset"],
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const canContinue = status === "valid" && !submitting;

  return (
    <div className="text-gray-100">
      {/* header row: title + single gated primary action */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-2xl font-semibold">New forecast</span>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            canContinue
              ? "bg-blue-500 text-white cursor-pointer hover:bg-blue-600"
              : "bg-white/5 text-gray-500 cursor-default"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting…
            </>
          ) : (
            "Continue"
          )}
        </button>
      </div>

      {/* stepper: Upload active, downstream locked */}
      <div className="flex items-center gap-3 px-[18px] py-4 border-[0.5px] border-white/10 rounded-[10px] mb-[18px]">
        <Step active label="Upload" badge="1" />
        <Line />
        <Step locked label="Preprocess" />
        <Line />
        <Step locked label="Run" />
      </div>

      {/* the card */}
      <div className="border-[0.5px] border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-semibold">Upload dataset</span>
          <span className="text-[11px] px-2.5 py-[3px] rounded-lg bg-white/5 text-gray-500">
            {statusLabel(status)}
          </span>
        </div>

        <label className="block text-xs text-gray-400 mb-1.5">
          Dataset name
        </label>
        <input
          value={datasetName}
          onChange={(e) => setDatasetName(e.target.value)}
          placeholder="Building_A_Data"
          className="w-full h-10 px-3 box-border bg-transparent text-gray-100 text-sm rounded-lg border-[0.5px] border-white/20 outline-none focus:border-white/40"
        />

        {/* fixed-footprint region: contents swap by state */}
        <div className="mt-3.5 min-h-[150px]">
          {status === "empty" && (
            <EmptyZone
              inputRef={inputRef}
              onFile={handleFile}
              onDrop={onDrop}
            />
          )}
          {status === "uploading" && (
            <Uploading fileName={fileName} progress={progress} />
          )}
          {status === "invalid" && (
            <Invalid fileName={fileName} result={result} onReplace={reset} />
          )}
          {status === "valid" && <Valid result={result} />}
        </div>

        {serverError && (
          <div className="mt-2.5 text-xs text-red-400">{serverError}</div>
        )}
      </div>
    </div>
  );
}

/* ---------------- state views ---------------- */

function EmptyZone({ inputRef, onFile, onDrop }) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-2 p-[30px] min-h-[120px] rounded-[10px] border border-dashed border-white/[0.16] cursor-pointer hover:border-white/30 transition-colors"
      >
        <Upload size={26} className="text-gray-500" />
        <span className="text-sm text-gray-400">
          Drop CSV or Excel, or browse
        </span>
        <span className="text-xs text-gray-500">
          daily timestamp + kWh · min {MIN_ROWS} rows
        </span>
      </div>
    </>
  );
}

function Uploading({ fileName, progress }) {
  return (
    <div className="flex flex-col justify-center p-[30px] min-h-[120px] rounded-[10px] border border-dashed border-white/[0.16]">
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet size={16} className="text-blue-400" />
        <span className="text-sm">{fileName}</span>
      </div>
      <div className="h-1.5 rounded-[3px] bg-white/5 overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-gray-500">uploading…</span>
        <span className="text-xs text-gray-500">{progress}%</span>
      </div>
    </div>
  );
}

function Invalid({ fileName, result, onReplace }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <FileX size={16} className="text-red-400" />
        <span className="text-sm">{fileName}</span>
      </div>
      <div className="flex flex-col gap-1.5 mb-3.5">
        {result?.hardErrors?.map((e, i) => (
          <Row
            key={`h${i}`}
            className="text-red-400"
            icon={<XCircle size={14} />}
            text={e}
          />
        ))}
        {result?.warnings?.map((w, i) => (
          <Row
            key={`w${i}`}
            className="text-amber-400"
            icon={<AlertTriangle size={14} />}
            text={w}
          />
        ))}
      </div>
      <button
        onClick={onReplace}
        className="w-full h-10 rounded-lg border-[0.5px] border-white/20 bg-transparent text-gray-100 text-sm inline-flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <RefreshCw size={14} /> Replace file
      </button>
    </div>
  );
}

function Valid({ result }) {
  return (
    <div>
      <div className="border-[0.5px] border-white/10 rounded-lg overflow-hidden">
        <div className="grid grid-cols-2 px-3 py-2 text-xs text-gray-400 bg-white/5">
          <span>date</span>
          <span className="text-right">kwh</span>
        </div>
        {result?.preview?.slice(0, 4).map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-2 px-3 py-2 text-[13px] border-t border-white/10"
          >
            <span className="font-mono">{r.date}</span>
            <span className="text-right font-mono">{r.raw}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2.5">
        <CheckCircle2 size={14} className="text-green-400" />
        <span className="text-xs text-green-400">
          {result?.rowCount} rows · {result?.duplicateCount} duplicates · format
          OK
        </span>
      </div>
      {result?.warnings?.map((w, i) => (
        <div key={i} className="mt-1.5">
          <Row
            className="text-amber-400"
            icon={<AlertTriangle size={14} />}
            text={w}
          />
        </div>
      ))}
    </div>
  );
}

/* ---------------- small pieces ---------------- */

function Step({ active, locked, label, badge }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[13px] font-semibold ${
          active ? "bg-blue-400 text-[#0b0e14]" : "bg-white/5 text-gray-500"
        }`}
      >
        {locked ? <Lock size={13} /> : badge}
      </span>
      <span
        className={`text-sm ${active ? "font-semibold text-gray-100" : "text-gray-500"}`}
      >
        {label}
      </span>
    </div>
  );
}

function Line() {
  return <div className="flex-1 h-px bg-white/10" />;
}

function Row({ className, icon, text }) {
  return (
    <div className={`flex items-center gap-1.5 text-[13px] ${className}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function statusLabel(s) {
  return {
    empty: "initial",
    uploading: "in progress",
    invalid: "needs attention",
    valid: "ready",
  }[s];
}
