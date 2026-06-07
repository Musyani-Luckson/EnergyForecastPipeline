import pandas as pd
from algorithm.preprocess.outlierProcessing.ReplacementEngine import ReplacementEngine


class ZScoreCleaner:

    @staticmethod
    def clean(
        series: pd.Series,
        threshold: float = 3.0,
        strategy: str = "local_median",
        window: int = 3,
    ):

        cleaned = series.copy()

        mean = cleaned.mean()
        std = cleaned.std()

        if std == 0:
            return cleaned

        z_scores = (cleaned - mean) / std

        outliers = z_scores.abs() > threshold

        lower_bound = 0  # energy constraint
        upper_bound = cleaned.mean() + threshold * std

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
