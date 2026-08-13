import math


class AccuracyEvaluator:
    """
    Control class computing forecast accuracy metrics
    (per the system class diagram: AccuracyEvaluator.evaluate()).

    Also assesses the acceptance thresholds defined in
    Methodology 3.3.4:
        RMSE <= 15% of the mean actual demand
        MAPE <= 10%

    Pure computation class: no Django dependencies.
    """

    RMSE_THRESHOLD_PCT = 15.0
    MAPE_THRESHOLD_PCT = 10.0

    @staticmethod
    def evaluate(actual, predicted) -> dict:
        """
        Compute MAE, RMSE and MAPE between two aligned
        sequences of observations, plus the acceptance
        verdicts against the defined thresholds.
        """
        if actual is None or predicted is None:
            raise ValueError("actual and predicted are required.")

        actual = [float(v) for v in actual]
        predicted = [float(v) for v in predicted]

        if len(actual) == 0:
            raise ValueError("actual is empty.")

        if len(actual) != len(predicted):
            raise ValueError(
                f"Length mismatch: actual={len(actual)}, predicted={len(predicted)}."
            )

        errors = [a - p for a, p in zip(actual, predicted)]
        n = len(errors)

        mae = sum(abs(e) for e in errors) / n
        rmse = math.sqrt(sum(e * e for e in errors) / n)

        # MAPE skips zero actuals to avoid division by zero.
        percentage_terms = [
            abs(e / a) for e, a in zip(errors, actual) if a != 0
        ]

        mape = (
            (sum(percentage_terms) / len(percentage_terms)) * 100
            if percentage_terms
            else None
        )

        # Acceptance thresholds (Methodology 3.3.4).
        mean_actual = sum(actual) / n

        rmse_pct_of_mean = (
            (rmse / mean_actual) * 100 if mean_actual != 0 else None
        )

        meets_rmse_threshold = (
            rmse_pct_of_mean <= AccuracyEvaluator.RMSE_THRESHOLD_PCT
            if rmse_pct_of_mean is not None
            else None
        )

        meets_mape_threshold = (
            mape <= AccuracyEvaluator.MAPE_THRESHOLD_PCT
            if mape is not None
            else None
        )

        return {
            "n_observations": n,
            "mae": mae,
            "rmse": rmse,
            "mape": mape,
            "rmse_pct_of_mean": rmse_pct_of_mean,
            "meets_rmse_threshold": meets_rmse_threshold,
            "meets_mape_threshold": meets_mape_threshold,
        }
