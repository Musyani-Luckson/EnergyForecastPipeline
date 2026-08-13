import pandas as pd

from algorithm.forecastEngine.stationarity.StationarityEngine import StationarityEngine


class DifferencingEngine:
    """
    Regular and seasonal differencing with automatic
    order recommendation.

    Pure computation class: accepts a pandas Series,
    returns Series/dicts. No Django dependencies.
    """

    MAX_REGULAR_ORDER = 2
    MAX_SEASONAL_ORDER = 1

    @staticmethod
    def apply(
        series: pd.Series,
        order: int = 1,
        seasonal_order: int = 0,
        seasonal_period: int = 12,
    ) -> pd.Series:
        """
        Apply seasonal differencing first (if requested),
        then regular differencing.
        """
        if series is None or len(series) == 0:
            raise ValueError("Series is empty.")

        if order < 0 or seasonal_order < 0:
            raise ValueError("Differencing orders must be non-negative.")

        if seasonal_order > 0 and seasonal_period < 2:
            raise ValueError("seasonal_period must be >= 2 for seasonal differencing.")

        differenced = series.dropna()

        for _ in range(seasonal_order):
            differenced = differenced.diff(seasonal_period).dropna()

        for _ in range(order):
            differenced = differenced.diff().dropna()

        if len(differenced) == 0:
            raise ValueError("Differencing removed all observations.")

        return differenced

    @classmethod
    def recommend(
        cls,
        series: pd.Series,
        seasonal_period: int = 12,
        significance: float = StationarityEngine.DEFAULT_SIGNIFICANCE,
    ) -> dict:
        """
        Recommend the smallest (d, D) that yields a stationary
        series according to the ADF test.

        Tries D in [0, MAX_SEASONAL_ORDER] and d in
        [0, MAX_REGULAR_ORDER], smallest total differencing first.
        """
        attempts = []

        candidates = sorted(
            (
                (d, D)
                for D in range(cls.MAX_SEASONAL_ORDER + 1)
                for d in range(cls.MAX_REGULAR_ORDER + 1)
            ),
            key=lambda pair: (pair[0] + pair[1], pair[1]),
        )

        for d, D in candidates:
            try:
                differenced = cls.apply(
                    series,
                    order=d,
                    seasonal_order=D,
                    seasonal_period=seasonal_period,
                )
                report = StationarityEngine.analyze(differenced, significance)
            except ValueError as exc:
                attempts.append({"d": d, "D": D, "error": str(exc)})
                continue

            attempts.append({"d": d, "D": D, "p_value": report["p_value"]})

            if report["is_stationary"]:
                return {
                    "recommended_d": d,
                    "recommended_D": D,
                    "seasonal_period": seasonal_period,
                    "stationarity": report,
                    "attempts": attempts,
                }

        return {
            "recommended_d": None,
            "recommended_D": None,
            "seasonal_period": seasonal_period,
            "stationarity": None,
            "attempts": attempts,
        }
