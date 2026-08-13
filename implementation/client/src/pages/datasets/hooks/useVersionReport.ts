import { useCallback, useRef, useState } from "react";
import { fetchVersionReport, type QualityReport } from "../../../api/datasetsAPI";

type Cache = Record<number, QualityReport>;

interface UseVersionReportResult {
  /** Report for the most recently loaded version. */
  report: QualityReport | null;
  loading: boolean;
  error: string | null;
  load: (versionId: number) => Promise<void>;
  /** Any previously loaded report, by version id — powers checkpoint deltas. */
  reportFor: (versionId: number | undefined) => QualityReport | null;
  reset: () => void;
}

/**
 * Fetches quality-report analyses on demand and caches them by version id.
 *
 * The cache is what makes a checkpoint a checkpoint: once a stage has been
 * analysed, its report stays available so later stages can be rendered as a
 * delta against the one before them rather than as a fresh set of absolutes.
 */
export function useVersionReport(): UseVersionReportResult {
  const [cache, setCache] = useState<Cache>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirrors `cache` so `load` can test for a hit synchronously, and tracks the
  // most recent request so a slow earlier one can't overwrite a newer result.
  const cacheRef = useRef<Cache>({});
  const latest = useRef<number | null>(null);

  const load = useCallback(async (versionId: number) => {
    latest.current = versionId;
    setActiveId(versionId);
    setError(null);

    // Already analysed — show it immediately: no spinner, no refetch.
    if (cacheRef.current[versionId]) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await fetchVersionReport(versionId);
      cacheRef.current = { ...cacheRef.current, [versionId]: result };
      if (latest.current !== versionId) return;
      setCache(cacheRef.current);
    } catch {
      if (latest.current === versionId) {
        setError("Could not load the analysis for this version.");
      }
    } finally {
      if (latest.current === versionId) setLoading(false);
    }
  }, []);

  const reportFor = useCallback(
    (versionId: number | undefined) =>
      versionId == null ? null : (cache[versionId] ?? null),
    [cache],
  );

  const reset = useCallback(() => {
    latest.current = null;
    cacheRef.current = {};
    setCache({});
    setActiveId(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    report: activeId == null ? null : (cache[activeId] ?? null),
    loading,
    error,
    load,
    reportFor,
    reset,
  };
}
