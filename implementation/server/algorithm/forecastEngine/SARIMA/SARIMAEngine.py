import warnings

import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX


class SARIMAEngine:
    """
    SARIMA model fitting and forecasting built on
    statsmodels SARIMAX.

    Pure computation class: accepts pandas Series,
    returns plain dicts. No Django dependencies.
    """

    # System Design 4.4.3.5: minimum clean data points before
    # a SARIMA model may be fitted.
    MIN_OBSERVATIONS = 24

    @staticmethod
    def split(series: pd.Series, holdout: int) -> tuple:
        """
        Split a series into (train, holdout) where holdout
        is the number of trailing observations reserved
        for accuracy evaluation.
        """
        if holdout < 0:
            raise ValueError("holdout must be non-negative.")

        if holdout >= len(series):
            raise ValueError(
                f"holdout ({holdout}) must be smaller than the series ({len(series)})."
            )

        if holdout == 0:
            return series, series.iloc[0:0]

        return series.iloc[:-holdout], series.iloc[-holdout:]

    @staticmethod
    def fit(
        series: pd.Series,
        order: tuple,
        seasonal_order: tuple,
    ):
        """
        Fit a SARIMAX model and return the statsmodels
        results object.

        order          -> (p, d, q)
        seasonal_order -> (P, D, Q, s)
        """
        if series is None or len(series) == 0:
            raise ValueError("Series is empty.")

        if len(series.dropna()) < SARIMAEngine.MIN_OBSERVATIONS:
            raise ValueError(
                f"SARIMA fitting requires at least "
                f"{SARIMAEngine.MIN_OBSERVATIONS} clean data points; "
                f"got {len(series.dropna())}."
            )

        if len(order) != 3:
            raise ValueError("order must be (p, d, q).")

        if len(seasonal_order) != 4:
            raise ValueError("seasonal_order must be (P, D, Q, s).")

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")

            model = SARIMAX(
                series.dropna(),
                order=tuple(order),
                seasonal_order=tuple(seasonal_order),
                enforce_stationarity=False,
                enforce_invertibility=False,
            )

            return model.fit(disp=False)

    @classmethod
    def forecast(
        cls,
        series: pd.Series,
        order: tuple,
        seasonal_order: tuple,
        horizon: int,
        confidence: float = 0.95,
        clip_negative: bool = True,
    ) -> dict:
        """
        Fit on the full series and forecast `horizon` steps
        ahead with confidence intervals.

        Clip-to-Zero Constraint (System Design 4.4.3.2): energy
        consumption is non-negative, so forecast values and
        lower confidence bounds below zero are clipped to zero
        after inference, before persistence.
        """
        if horizon < 1:
            raise ValueError("horizon must be at least 1.")

        if not 0 < confidence < 1:
            raise ValueError("confidence must be between 0 and 1.")

        results = cls.fit(series, order, seasonal_order)

        prediction = results.get_forecast(steps=horizon)
        intervals = prediction.conf_int(alpha=1 - confidence)

        values = [float(v) for v in prediction.predicted_mean]
        lower = [float(v) for v in intervals.iloc[:, 0]]
        upper = [float(v) for v in intervals.iloc[:, 1]]

        if clip_negative:
            values = [max(0.0, v) for v in values]
            lower = [max(0.0, v) for v in lower]

        return {
            "order": list(order),
            "seasonal_order": list(seasonal_order),
            "horizon": horizon,
            "confidence": confidence,
            "values": values,
            "lower_bound": lower,
            "upper_bound": upper,
            "aic": float(results.aic),
            "bic": float(results.bic),
        }

    @classmethod
    def predict_holdout(
        cls,
        train: pd.Series,
        holdout: pd.Series,
        order: tuple,
        seasonal_order: tuple,
    ) -> dict:
        """
        Fit on the training window and predict the holdout
        window, returning aligned actual/predicted values
        for accuracy evaluation.
        """
        if len(holdout) == 0:
            raise ValueError("holdout is empty.")

        results = cls.fit(train, order, seasonal_order)
        prediction = results.get_forecast(steps=len(holdout))

        return {
            "actual": [float(v) for v in holdout],
            "predicted": [float(v) for v in prediction.predicted_mean],
        }
