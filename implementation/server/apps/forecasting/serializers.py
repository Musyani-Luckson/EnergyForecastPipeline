"""Derive the client's ForecastResult DTO from the normalized tables."""
from apps.forecasting.services.forecast_runner import detect_peaks

# Contract acceptance thresholds (Methodology 3.3.4).
RMSE_THRESHOLD_PCT = 15.0
MAPE_THRESHOLD_PCT = 10.0


def build_forecast_dto(forecast) -> dict:
    """Assemble the legacy ForecastResult shape from Forecast +
    ForecastValue + EvaluationMetric. Nothing is stored - arrays,
    peaks and threshold verdicts are all derived on read."""
    rows = list(forecast.values.all().order_by("forecast_date"))
    values = [float(r.predicted_value) for r in rows]
    lower = [float(r.lower_confidence) for r in rows]
    upper = [float(r.upper_confidence) for r in rows]

    metrics = {}
    ev = getattr(forecast, "evaluation", None)
    if ev is not None:
        rmse = float(ev.rmse)
        mae = float(ev.mae)
        mape = float(ev.mape) if ev.mape is not None else None
        mean_v = (sum(values) / len(values)) if values else 0.0
        rmse_pct = (rmse / mean_v * 100) if mean_v else None
        metrics = {
            "n_observations": len(values),
            "rmse": rmse,
            "mae": mae,
            "mape": mape,
            "rmse_pct_of_mean": rmse_pct,
            "meets_rmse_threshold": (rmse_pct <= RMSE_THRESHOLD_PCT)
            if rmse_pct is not None else None,
            "meets_mape_threshold": (mape <= MAPE_THRESHOLD_PCT)
            if mape is not None else None,
        }

    return {
        "id": forecast.id,
        "dataset": forecast.dataset_id,
        "dataset_name": forecast.dataset.dataset_name,
        "run_id": str(forecast.processing_job_id),
        "order": forecast.order,
        "seasonal_order": forecast.seasonal_order,
        "values": values,
        "lower_bound": lower,
        "upper_bound": upper,
        "peaks": detect_peaks(values),
        "metrics": metrics,
        "created_at": forecast.created_at,
    }
