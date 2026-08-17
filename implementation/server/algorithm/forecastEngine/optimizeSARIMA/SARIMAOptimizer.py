import itertools
import os
from concurrent.futures import ProcessPoolExecutor, as_completed

import pandas as pd

from algorithm.forecastEngine.SARIMA.SARIMAEngine import SARIMAEngine


def _fit_candidate(payload):
    """
    Fit one candidate and return its result, or the error that rejected it.

    Defined at module level, and free of any Django import, so it can be
    pickled to a worker process: the workers do computation only and never
    touch the database.
    """
    series, order, seasonal_order = payload
    try:
        results = SARIMAEngine.fit(series, order, seasonal_order)
    except Exception as exc:
        return {
            "order": list(order),
            "seasonal_order": list(seasonal_order),
            "error": str(exc),
        }
    return {
        "order": list(order),
        "seasonal_order": list(seasonal_order),
        "aic": float(results.aic),
        "bic": float(results.bic),
    }


def _rank_key(candidate):
    """
    Sort by AIC, then by the orders themselves.

    The tie-break matters once candidates are fitted in parallel: they
    complete out of order, so ranking on AIC alone would let two models
    with equal AIC swap places between runs. Including the orders makes
    the selection reproducible regardless of completion order.
    """
    return (candidate["aic"], candidate["order"], candidate["seasonal_order"])


def default_workers() -> int:
    """
    Processes to fit with, leaving one core for the rest of the system.

    Capped because the search is short enough that further processes buy
    little, and each one pays the cost of importing statsmodels.
    """
    cores = os.cpu_count() or 1
    return max(1, min(cores - 1, 8))


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
        workers=None,
    ) -> dict:
        """
        Fit every (p, d, q)(P, D, Q, s) combination and rank
        candidates by AIC (ascending).

        d and D are fixed inputs - they come from the
        differencing analysis, not from the search.

        progress_callback, if given, is called after each candidate as
        progress_callback(done, total, evaluated, best_so_far), where
        `evaluated` is the candidate just fitted (carrying either its
        AIC/BIC or the error that rejected it) and `best_so_far` is the
        lowest-AIC candidate seen up to that point.

        Candidates are independent, so they are fitted across `workers`
        processes. This shortens the search without altering it: every
        combination is still fitted, and the ranking is unchanged because
        it is settled by AIC with a deterministic tie-break rather than by
        the order in which fits happen to finish. Pass workers=1 to fit
        sequentially in this process.
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

        payloads = [
            (series, (p, d, q), (P, D, Q, seasonal_period))
            for p, q, P, Q in combinations
        ]

        if workers is None:
            workers = default_workers()
        workers = max(1, min(int(workers), total))

        # Results keyed by position, so a candidate fitted in a worker is
        # never fitted again if the pool later fails.
        results = {}
        completed = 0

        def record(evaluated):
            """Collect one result and report the running leader."""
            nonlocal completed
            completed += 1

            if "error" in evaluated:
                failures.append(evaluated)
            else:
                candidates.append(evaluated)

            # The running leader, so an observer can see the search
            # converging rather than only its final answer.
            best_so_far = min(candidates, key=_rank_key) if candidates else None

            if progress_callback:
                progress_callback(completed, total, evaluated, best_so_far)

        used_workers = workers
        if workers > 1:
            try:
                with ProcessPoolExecutor(max_workers=workers) as pool:
                    futures = {
                        pool.submit(_fit_candidate, payload): position
                        for position, payload in enumerate(payloads)
                    }
                    for future in as_completed(futures):
                        position = futures[future]
                        results[position] = future.result()
                        record(results[position])
            except Exception:
                # Process pools are unavailable in some environments (a
                # restricted container, or a platform that cannot spawn),
                # and shutdown can fail even after the work is done. Only
                # the candidates that did not come back are refitted here,
                # so nothing is fitted or reported twice.
                used_workers = 1

        for position, payload in enumerate(payloads):
            if position in results:
                continue
            results[position] = _fit_candidate(payload)
            record(results[position])
            used_workers = 1

        if not candidates:
            raise ValueError(
                f"Grid search failed: none of the {len(combinations)} "
                "candidate models could be fitted."
            )

        candidates.sort(key=_rank_key)

        return {
            "best": candidates[0],
            "candidates": candidates,
            "failures": failures,
            "evaluated": len(combinations),
            "workers": used_workers,
        }
