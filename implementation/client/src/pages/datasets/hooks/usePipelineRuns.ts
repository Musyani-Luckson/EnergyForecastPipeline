import { useCallback, useEffect, useState } from "react";
import { fetchPipelineRuns, type PipelineRun } from "../../../api/datasetsAPI";

interface UsePipelineRunsResult {
  runs: PipelineRun[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Loads all dataset pipeline runs (one run == one uploaded dataset). */
export function usePipelineRuns(): UsePipelineRunsResult {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPipelineRuns()
      .then(setRuns)
      .catch(() => setError("Could not load datasets. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { runs, loading, error, refresh: load };
}
