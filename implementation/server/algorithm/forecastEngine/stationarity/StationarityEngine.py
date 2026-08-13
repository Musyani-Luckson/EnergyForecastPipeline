import pandas as pd
from statsmodels.tsa.stattools import adfuller


class StationarityEngine:
    """
    Stationarity analysis using the Augmented Dickey-Fuller test.

    Pure computation class: accepts a pandas Series,
    returns a plain dict. No Django dependencies.
    """

    DEFAULT_SIGNIFICANCE = 0.05

    @staticmethod
    def analyze(series: pd.Series, significance: float = DEFAULT_SIGNIFICANCE) -> dict:
        """
        Run the ADF test on a series.

        Returns a report dict with the test statistic, p-value,
        critical values and a stationarity verdict.
        """
        if series is None or len(series) == 0:
            raise ValueError("Series is empty.")

        if not 0 < significance < 1:
            raise ValueError("significance must be between 0 and 1.")

        cleaned = series.dropna()

        if len(cleaned) < 12:
            raise ValueError(
                f"Series too short for ADF test ({len(cleaned)} observations)."
            )

        statistic, p_value, used_lag, n_obs, critical_values, _ = adfuller(
            cleaned,
            autolag="AIC",
        )

        return {
            "test": "ADF",
            "statistic": float(statistic),
            "p_value": float(p_value),
            "used_lag": int(used_lag),
            "n_observations": int(n_obs),
            "critical_values": {k: float(v) for k, v in critical_values.items()},
            "significance": significance,
            "is_stationary": bool(p_value < significance),
        }
