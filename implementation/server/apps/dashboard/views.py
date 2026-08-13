from django.db.models import Count

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.datasets.models import Dataset
from apps.processing.models import ProcessingJob, DatasetVersion
from apps.forecasting.models import Forecast
from apps.forecasting.serializers import build_forecast_dto


class OverviewView(APIView):
    """
    Dashboard overview — aggregates pipeline and forecast state,
    all queried from the normalized tables.
    """

    def get(self, request):
        stage_counts = {
            row["stage"].upper(): row["count"]
            for row in DatasetVersion.objects.values("stage").annotate(count=Count("id"))
        }

        recent = (
            Forecast.objects.select_related("dataset", "evaluation")
            .prefetch_related("values")
            .order_by("-created_at")[:5]
        )

        return Response(
            {
                "success": True,
                "message": "Dashboard overview retrieved.",
                "data": {
                    "datasets": {
                        "total": Dataset.objects.count(),
                        "versions_by_stage": stage_counts,
                        "runs": ProcessingJob.objects.count(),
                    },
                    "forecasts": {
                        "total": Forecast.objects.count(),
                        "recent": [build_forecast_dto(f) for f in recent],
                    },
                },
            },
            status=status.HTTP_200_OK,
        )


class AnalyticsView(APIView):
    """
    Dashboard analytics — forecast series + metrics per run, derived
    from the normalized tables.
    """

    def get(self, request):
        run_id = request.query_params.get("run_id")

        forecasts = (
            Forecast.objects.select_related("dataset", "evaluation")
            .prefetch_related("values")
            .order_by("-created_at")
        )
        if run_id:
            forecasts = forecasts.filter(processing_job_id=run_id)

        return Response(
            {
                "success": True,
                "message": "Analytics retrieved.",
                "data": [build_forecast_dto(f) for f in forecasts],
            },
            status=status.HTTP_200_OK,
        )
