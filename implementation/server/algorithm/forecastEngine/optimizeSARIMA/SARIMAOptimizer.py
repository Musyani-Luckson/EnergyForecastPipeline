import itertools

import pandas as pd

from algorithm.forecastEngine.SARIMA.SARIMAEngine import SARIMAEngine


class SARIMAOptimizer:
    """
    Grid-search SARIMA order selection ranked by AIC.

    Produces the full ranked candidate table so the search
    itself is auditable, not just the winning order.

    Pure computation class: no Django dependencies.
    """

    # Bounded search space per Methodology 3.3.3 Stage 2:
    # p, q in {0..3}; P, Q in {0..2}. (d in {0..2} and D in
    # {0, 1} are fixed by the differencing analysis, and
    # s in {7, 30} by seasonal period detection.)
    DEFAULT_P_RANGE = (0, 1, 2, 3)
    DEFAULT_Q_RANGE = (0, 1, 2, 3)
    DEFAULT_SEASONAL_P_RANGE = (0, 1, 2)
    DEFAULT_SEASONAL_Q_RANGE = (0, 1, 2)

    @classmethod
    def grid_search(
        cls,
        series: pd.Series,
        d: int,
        D: int,
        seasonal_period: int = 12,
        p_range=DEFAULT_P_RANGE,
        q_range=DEFAULT_Q_RANGE,
        P_range=DEFAULT_SEASONAL_P_RANGE,
        Q_range=DEFAULT_SEASONAL_Q_RANGE,
        progress_callback=None,
    ) -> dict:
        """
        Fit every (p, d, q)(P, D, Q, s) combination and rank
        candidates by AIC (ascending).

        d and D are fixed inputs — they come from the
        differencing analysis, not from the search.

        progress_callback, if given, is called after each candidate as
        progress_callback(done, total, evaluated, best_so_far), where
        `evaluated` is the candidate just fitted (carrying either its
        AIC/BIC or the error that rejected it) and `best_so_far` is the
        lowest-AIC candidate seen up to that point.
        """
        if series is None or len(series) == 0:
            raise ValueError("Series is empty.")

        if d < 0 or D < 0:
            raise ValueError("d and D must be non-negative.")

        if D > 0 and seasonal_period < 2:
            raise ValueError("seasonal_period must be >= 2 when D > 0.")

        candidates = []
        failures = []

        combinations = list(
            itertools.product(p_range, q_range, P_range, Q_range)
        )

        total = len(combinations)

        for index, (p, q, P, Q) in enumerate(combinations, start=1):
            order = (p, d, q)
            seasonal_order = (P, D, Q, seasonal_period)

            try:
                results = SARIMAEngine.fit(series, order, seasonal_order)
            except Exception as exc:
                evaluated = {
                    "order": list(order),
                    "seasonal_order": list(seasonal_order),
                    "error": str(exc),
                }
                failures.append(evaluated)
            else:
                evaluated = {
                    "order": list(order),
                    "seasonal_order": list(seasonal_order),
                    "aic": float(results.aic),
                    "bic": float(results.bic),
                }
                candidates.append(evaluated)

            # The running leader, so an observer can see the search
            # converging rather than only its final answer.
            best_so_far = min(candidates, key=lambda c: c["aic"]) if candidates else None

            if progress_callback:
                progress_callback(index, total, evaluated, best_so_far)

        if not candidates:
            raise ValueError(
                f"Grid search failed: none of the {len(combinations)} "
                "candidate models could be fitted."
            )

        candidates.sort(key=lambda c: c["aic"])

        return {
            "best": candidates[0],
            "candidates": candidates,
            "failures": failures,
            "evaluated": len(combinations),
        }
