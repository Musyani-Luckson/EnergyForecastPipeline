import { Cpu, Droplets, Lock, RotateCcw, Ruler, Sigma, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Section } from "@/pages/report/Section";
import { useAuth } from "@/state-manager/hooks/authHook";
import { canManageUsers } from "@/pages/users/roles";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SETTINGS, ENGINE_PARAMS, THRESHOLD_PARAMS, type AppSettings, type ReadOnlyParam,
} from "./defaults";
import { isModified, resetSettings, updateSettings, useSettings } from "./settingsStore";

/** A boolean parameter with its consequence spelled out. */
function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 transition",
        disabled ? "border-slate-200 bg-slate-50/60" : "border-slate-200 hover:border-slate-300 cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-blue-600 disabled:cursor-not-allowed"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500 mt-0.5">{description}</span>
      </span>
    </label>
  );
}

function ReadOnlyRow({ param }: { param: ReadOnlyParam }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm text-slate-700">{param.label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{param.description}</p>
        <p className="text-[10px] font-mono text-slate-400 mt-0.5 break-all">{param.source}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums text-slate-800 shrink-0">
        {param.value}
      </span>
    </div>
  );
}

export default function Settings() {
  const { role } = useAuth();
  const isAdmin = canManageUsers(role);
  const settings = useSettings();
  const modified = isModified(settings);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    updateSettings({ [key]: value } as Partial<AppSettings>);

  const field =
    "rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

  return (
    <div className="px-8 py-7 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Parameters that govern preprocessing and forecasting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modified && <Badge variant="warning">Modified from defaults</Badge>}
          {isAdmin && (
            <button
              onClick={resetSettings}
              disabled={!modified}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RotateCcw size={14} /> Restore defaults
            </button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Lock size={15} className="mt-0.5 shrink-0 text-slate-400" />
          <span>
            These parameters are set by an administrator. You can review the current configuration
            but not change it.
          </span>
        </div>
      )}

      {/* ── Editable: these reach the pipeline today ────────────────────────── */}
      <Section
        icon={Droplets}
        title="Data Cleaning"
        description="Applied when a dataset is cleaned."
        action={<Badge variant="success">Applied to new runs</Badge>}
      >
        <div className="grid md:grid-cols-3 gap-2.5">
          <Toggle
            label="Remove duplicates"
            description="Drop rows that repeat an existing record exactly."
            checked={settings.removeDuplicates}
            disabled={!isAdmin}
            onChange={(v) => set("removeDuplicates", v)}
          />
          <Toggle
            label="Enforce daily continuity"
            description="Insert a row for every calendar day with no reading."
            checked={settings.enforceDailyContinuity}
            disabled={!isAdmin}
            onChange={(v) => set("enforceDailyContinuity", v)}
          />
          <Toggle
            label="Fill missing values"
            description="Impute gaps left by missing or inserted rows."
            checked={settings.fillMissingValues}
            disabled={!isAdmin}
            onChange={(v) => set("fillMissingValues", v)}
          />
        </div>
        {settings.enforceDailyContinuity && !settings.fillMissingValues && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-600 mt-2">
            <TriangleAlert size={12} className="mt-0.5 shrink-0" />
            The server requires missing-value filling when continuity is enforced, and will enable
            it automatically.
          </p>
        )}
      </Section>

      <Section
        icon={Ruler}
        title="Outlier Detection"
        description="How anomalous readings are identified."
        action={<Badge variant="success">Applied to new runs</Badge>}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Detection method</span>
            <select
              value={settings.outlierMethod}
              disabled={!isAdmin}
              onChange={(e) => set("outlierMethod", e.target.value as AppSettings["outlierMethod"])}
              className={cn(field, "mt-1 w-full")}
            >
              <option value="iqr">IQR — 1.5 × interquartile range</option>
              <option value="zscore">Z-score — standard deviations from the mean</option>
            </select>
            <span className="block text-[11px] text-slate-500 mt-1">
              IQR is the methodology default and is resistant to extreme values.
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">
              Z-score threshold
              {settings.outlierMethod !== "zscore" && (
                <span className="text-slate-400 font-normal"> (used with Z-score only)</span>
              )}
            </span>
            <input
              type="number"
              min={1}
              max={6}
              step={0.5}
              value={settings.zscoreThreshold}
              disabled={!isAdmin || settings.outlierMethod !== "zscore"}
              onChange={(e) => set("zscoreThreshold", Number(e.target.value))}
              className={cn(field, "mt-1 w-full")}
            />
            <span className="block text-[11px] text-slate-500 mt-1">
              Lower values flag more readings as anomalous. Default 3.
            </span>
          </label>
        </div>
      </Section>

      <Section
        icon={Sigma}
        title="Stationarity"
        description="Differencing applied before the model is fitted."
        action={<Badge variant="success">Applied to new runs</Badge>}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Seasonal period (days)</span>
            <input
              type="number"
              min={2}
              max={365}
              value={settings.seasonalPeriod}
              disabled={!isAdmin}
              onChange={(e) => set("seasonalPeriod", Number(e.target.value))}
              className={cn(field, "mt-1 w-full")}
            />
            <span className="block text-[11px] text-slate-500 mt-1">
              7 for weekly cycles, 30 for monthly. Default {DEFAULT_SETTINGS.seasonalPeriod}.
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Seasonal differencing order</span>
            <input
              type="number"
              min={0}
              max={1}
              value={settings.seasonalDifferencingOrder}
              disabled={!isAdmin}
              onChange={(e) => set("seasonalDifferencingOrder", Number(e.target.value))}
              className={cn(field, "mt-1 w-full")}
            />
            <span className="block text-[11px] text-slate-500 mt-1">
              0 or 1. The non-seasonal order comes from each dataset's ADF result.
            </span>
          </label>
        </div>
      </Section>

      {/* ── Read-only: no request field exposes these yet ───────────────────── */}
      <Section
        icon={Cpu}
        title="Forecasting Engine"
        description="SARIMA configuration currently in force."
        action={<Badge variant="secondary">Server-defined</Badge>}
      >
        <div className="divide-y divide-slate-100">
          {ENGINE_PARAMS.map((p) => (
            <ReadOnlyRow key={p.label} param={p} />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          The forecast endpoint accepts only a dataset id, so these are fixed in the engine. Making
          them adjustable needs a configuration field on <code>/api/forecasting/run/</code>.
        </p>
      </Section>

      <Section
        icon={TriangleAlert}
        title="Quality Thresholds"
        description="The bars a dataset and its forecast must clear."
        action={<Badge variant="secondary">Server-defined</Badge>}
      >
        <div className="divide-y divide-slate-100">
          {THRESHOLD_PARAMS.map((p) => (
            <ReadOnlyRow key={p.label} param={p} />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          These are module-level constants. Changing them means editing the source, or moving them
          into a settings model the API can read.
        </p>
      </Section>

      <p className="text-[11px] text-slate-400">
        Editable settings are stored in this browser and applied to the next pipeline step you run.
        They aren’t yet shared across users or devices — that needs a settings endpoint on the
        server.
      </p>
    </div>
  );
}
