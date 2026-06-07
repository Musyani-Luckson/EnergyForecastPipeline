# services/outlier/replacement.py

import pandas as pd


class ReplacementEngine:
    """
    Centralized replacement strategies for outlier correction.

    Used by:
    - IQR detection
    - Z-score detection
    - Any future anomaly detector
    """

    @staticmethod
    def local_median(
        series: pd.Series, idx: int, window: int, lower: float, upper: float
    ):
        start = max(0, idx - window)
        end = min(len(series), idx + window + 1)

        neighborhood = series.iloc[start:end]

        valid = neighborhood[
            (neighborhood >= lower) & (neighborhood <= upper) & (neighborhood >= 0)
        ]

        return valid.median() if len(valid) > 0 else series.median()

    @staticmethod
    def global_median(series: pd.Series):
        return series.median()

    @staticmethod
    def mean(series: pd.Series):
        return series.mean()

    @staticmethod
    def forward_fill(series: pd.Series, idx: int):
        past = series.iloc[:idx]
        past = past[past >= 0]
        return past.iloc[-1] if len(past) > 0 else series.median()

    @staticmethod
    def backward_fill(series: pd.Series, idx: int):
        future = series.iloc[idx + 1 :]
        future = future[future >= 0]
        return future.iloc[0] if len(future) > 0 else series.median()
