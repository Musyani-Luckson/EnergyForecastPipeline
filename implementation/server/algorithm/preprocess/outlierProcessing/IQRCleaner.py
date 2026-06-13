# services/outlier/iqr.py

import pandas as pd
from algorithm.preprocess.outlierProcessing.ReplacementEngine import ReplacementEngine


class IQRCleaner:

    @staticmethod
    def clean(series: pd.Series, strategy: str = "local_median", window: int = 3):

        cleaned = series.copy()

        q1 = cleaned.quantile(0.25)
        q3 = cleaned.quantile(0.75)
        iqr = q3 - q1

        lower_bound = max(0, q1 - 1.5 * iqr)
        upper_bound = q3 + 1.5 * iqr

        outliers = (cleaned < 0) | (cleaned > upper_bound)

        for idx in cleaned[outliers].index:

            if strategy == "local_median":
                replacement = ReplacementEngine.local_median(
                    cleaned, idx, window, lower_bound, upper_bound
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
