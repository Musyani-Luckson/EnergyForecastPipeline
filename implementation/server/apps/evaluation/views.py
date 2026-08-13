from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.forecasting.models import Forecast
from apps.forecasting.serializers import (
    RMSE_THRESHOLD_PCT,
    MAPE_THRESHOLD_PCT,
)


def _metrics_payload(forecast) -> dict:
    """Derive the metrics payload (with threshold verdicts) from the
    stored EvaluationMetric — verdicts recomputed, not stored."""
    ev = getattr(forecast, "evaluation", None)
    if ev is None:
        return {}

    rmse = float(ev.rmse)
    mae = float(ev.mae)
    mape = float(ev.mape) if ev.mape is not None else None

    values = [float(v.predicted_value) for v in forecast.values.all()]
    mean_v = (sum(values) / len(values)) if values else 0.0
    rmse_pct = (rmse / mean_v * 100) if mean_v else None

    return {
        "rmse": rmse,
        "mae": mae,
        "mape": mape,
        "rmse_pct_of_mean": rmse_pct,
        "meets_rmse_threshold": (rmse_pct <= RMSE_THRESHOLD_PCT) if rmse_pct is not None else None,
        "meets_mape_threshold": (mape <= MAPE_THRESHOLD_PCT) if mape is not None else None,
    }


class MetricsView(APIView):
    """Retrieve stored accuracy metrics for a forecast (result_id = Forecast id)."""

    def get(self, request):
        result_id = request.query_params.get("result_id")
        if not result_id:
            return Response(
                {"success": False, "message": "result_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            forecast = Forecast.objects.prefetch_related("values").get(pk=result_id)
        except Forecast.DoesNotExist:
            return Response(
                {"success": False, "message": f"Forecast {result_id} not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "message": "Metrics retrieved.",
                "data": {"result_id": forecast.id, "metrics": _metrics_payload(forecast)},
            }
        )


class RunView(APIView):
    """
    Return the accuracy evaluation for a forecast. Metrics are computed
    during the forecast run (holdout); this endpoint surfaces them with
    the contract threshold verdicts.
    """

    def post(self, request):
        result_id = request.data.get("result_id")
        if not result_id:
            return Response(
                {"success": False, "message": "result_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            forecast = Forecast.objects.prefetch_related("values").get(pk=result_id)
        except Forecast.DoesNotExist:
            return Response(
                {"success": False, "message": f"Forecast {result_id} not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        metrics = _metrics_payload(forecast)
        if not metrics:
            return Response(
                {"success": False, "message": "No evaluation metrics for this forecast.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "Evaluation completed.",
                "data": {"result_id": forecast.id, "metrics": metrics},
            }
        )
