# services/outlier/iqr.py

import pandas as pd
from algorithm.preprocess.outlierProcessing.ReplacementEngine import ReplacementEngine


class IQRCleaner:
    """
    IQR-based anomaly detection and correction
    (per Methodology 3.3.3 Stage 1 and System Design 4.4.2):

        IQR         = Q3 - Q1
        Lower Bound = Q1 - 1.5 * IQR
        Upper Bound = Q3 + 1.5 * IQR

    Points outside [Lower, Upper] - and physically invalid
    negative readings - are anomalies, replaced by
    locality-based median imputation over a +/- 7-day
    neighbourhood (radius = 7) to preserve local seasonality.
    """

    # System Design 4.4.3.5: minimum records before IQR bounds
    # are considered statistically reliable.
    MIN_RECORDS = 48

    # System Design 4.4.2: rolling neighbourhood of seven days
    # on either side of each anomaly.
    DEFAULT_WINDOW = 7

    @staticmethod
    def clean(
        series: pd.Series,
        strategy: str = "local_median",
        window: int = DEFAULT_WINDOW,
    ):

        if len(series.dropna()) < IQRCleaner.MIN_RECORDS:
            raise ValueError(
                f"Preprocessing requires at least {IQRCleaner.MIN_RECORDS} "
                f"records for reliable IQR bounds; got {len(series.dropna())}."
            )

        cleaned = series.copy()

        q1 = cleaned.quantile(0.25)
        q3 = cleaned.quantile(0.75)
        iqr = q3 - q1

        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr

        # Valid replacement range: energy readings are non-negative.
        valid_lower = max(0, lower_bound)

        outliers = (
            (cleaned < lower_bound)
            | (cleaned > upper_bound)
            | (cleaned < 0)
        )

        for idx in cleaned[outliers].index:

            if strategy == "local_median":
                replacement = ReplacementEngine.local_median(
                    cleaned, idx, window, valid_lower, upper_bound
                )

            elif strategy == "global_median":
                replacement = ReplacementEngine.global_median(cleaned)

            elif strategy == "mean":
                replacement = ReplacementEngine.mean(cleaned)

            elif strategy == "forward_fill":
                replacement = ReplacementEngine.forward_fill(cleaned, idx)

            elif strategy == "backward_fill":
                replacement = ReplacementEngine.backward_fill(cleaned, idx)

            else:
                replacement = cleaned.median()

            cleaned.iloc[idx] = replacement

        return cleaned
