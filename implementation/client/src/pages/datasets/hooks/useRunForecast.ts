import { useEffect, useState } from "react";
import { fetchForecastSummaries, type ForecastSummary } from "../../../api/datasetsAPI";

/**
 * Loads the forecast summary for a run (only when a FORECAST version exists),
 * so the FORECAST version's "Generate Report" action can target its result id.
 */
export function useRunForecast(
  runId: string | undefined,
  hasForecast: boolean,
): ForecastSummary | null {
  const [forecast, setForecast] = useState<ForecastSummary | null>(null);

  useEffect(() => {
    if (!runId || !hasForecast) {
      setForecast(null);
      return;
    }
    let active = true;
    fetchForecastSummaries(runId)
      .then((list) => active && setForecast(list[0] ?? null))
      .catch(() => active && setForecast(null));
    return () => {
      active = false;
    };
  }, [runId, hasForecast]);

  return forecast;
}
