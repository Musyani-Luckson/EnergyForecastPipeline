import pandas as pd

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from utils.data_loader import load_dataset

from apps.processing.models import DatasetVersion, ProcessingJob
from apps.forecasting.models import Forecast
from apps.forecasting.serializers import build_forecast_dto
from apps.forecasting.services.forecast_runner import ForecastRunner


# ProcessingJob.status (lowercase) → client-facing status (uppercase).
STATUS_MAP = {
    ProcessingJob.Status.PENDING: "PENDING",
    ProcessingJob.Status.RUNNING: "RUNNING",
    ProcessingJob.Status.COMPLETED: "COMPLETED",
    ProcessingJob.Status.FAILED: "FAILED",
    ProcessingJob.Status.CANCELLED: "FAILED",
}


class RunForecastView(APIView):
    """
    Execute the forecasting engine on a DatasetVersion. The run is
    tracked on its ProcessingJob; pass "background": true to run
    asynchronously and poll the status endpoint.
    """

    def post(self, request):
        version_id = request.data.get("dataset_id")
        background = bool(request.data.get("background", False))

        if not version_id:
            return Response(
                {"success": False, "message": "dataset_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            source = DatasetVersion.objects.select_related("processing_job").get(id=version_id)
        except DatasetVersion.DoesNotExist:
            return Response(
                {"success": False, "message": f"Dataset version {version_id} not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        job = ForecastRunner.run(source, background=background)

        if background:
            return Response(
                {
                    "success": True,
                    "message": "Forecast run started.",
                    "data": {
                        "forecast_id": job.id,
                        "run_id": str(job.id),
                        "status": STATUS_MAP.get(job.status, job.status),
                    },
                },
                status=status.HTTP_202_ACCEPTED,
            )

        # Synchronous: terminal by now.
        if job.status == ProcessingJob.Status.FAILED:
            return Response(
                {"success": False, "message": job.error_message or "Forecast failed.",
                 "data": {"forecast_id": job.id}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        forecast = Forecast.objects.filter(processing_job=job).order_by("-created_at").first()
        return Response(
            {
                "success": True,
                "message": "Forecast generated.",
                "data": build_forecast_dto(forecast) if forecast else {"forecast_id": job.id},
            }
        )


class RunStatusView(APIView):
    """Poll a run's status (derived from ProcessingJob)."""

    def get(self, request):
        job_id = request.query_params.get("forecast_id")
        if not job_id:
            return Response(
                {"success": False, "message": "forecast_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            job = ProcessingJob.objects.get(id=job_id)
        except ProcessingJob.DoesNotExist:
            return Response(
                {"success": False, "message": f"Run {job_id} not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        forecast = Forecast.objects.filter(processing_job=job).order_by("-created_at").first()

        return Response(
            {
                "success": True,
                "message": "Status retrieved.",
                "data": {
                    "forecast_id": job.id,
                    "run_id": str(job.id),
                    "status": STATUS_MAP.get(job.status, job.status),
                    "progress": {"phase": job.current_stage},
                    "error": job.error_message or None,
                    "result_id": forecast.id if forecast else None,
                },
            }
        )


class ForecastSeriesView(APIView):
    """
    Historical (cleaned) series for a forecast's chart, derived on
    read from the forecast's source DatasetVersion file. Also returns
    the data range and the forecast's real dates. Nothing is stored.

    The complete history is returned, not a trailing window: the model
    is fitted on 100% of the series, so the chart must show the same
    span. Nothing is withheld from the fit or from the chart.
    """

    def get(self, request):
        forecast_id = request.query_params.get("forecast_id")
        if not forecast_id:
            return Response(
                {"success": False, "message": "forecast_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            forecast = (
                Forecast.objects.select_related("stationary_dataset_version")
                .prefetch_related("values")
                .get(pk=forecast_id)
            )
        except Forecast.DoesNotExist:
            return Response(
                {"success": False, "message": f"Forecast {forecast_id} not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        version = forecast.stationary_dataset_version
        try:
            df = load_dataset(version.file_path)["dataframe"]
            df = df.copy()
            df["Date"] = pd.to_datetime(df["Date"])
            df = df.dropna(subset=["Daily_kWh"]).sort_values("Date")
            points = [
                {"date": d.strftime("%Y-%m-%d"), "value": float(v)}
                for d, v in zip(df["Date"], df["Daily_kWh"])
            ]
        except Exception:
            points = []

        forecast_dates = [
            v.forecast_date.strftime("%Y-%m-%d")
            for v in forecast.values.all().order_by("forecast_date")
        ]

        return Response(
            {
                "success": True,
                "message": "Series retrieved.",
                "data": {
                    "historical": points,
                    "forecast_dates": forecast_dates,
                    "data_range": {
                        "start": points[0]["date"] if points else None,
                        "end": points[-1]["date"] if points else None,
                    },
                    "forecast_period": {
                        "start": forecast_dates[0] if forecast_dates else None,
                        "end": forecast_dates[-1] if forecast_dates else None,
                    },
                },
            }
        )


class ResultListView(APIView):
    """Retrieve forecast results (DTO derived from the normalized tables)."""

    def get(self, request):
        forecasts = Forecast.objects.select_related("dataset", "evaluation").prefetch_related("values")

        run_id = request.query_params.get("run_id")
        if run_id:
            forecasts = forecasts.filter(processing_job_id=run_id)

        forecasts = forecasts.order_by("-created_at")

        return Response(
            {
                "success": True,
                "message": "Forecast results retrieved.",
                "data": [build_forecast_dto(f) for f in forecasts],
            },
            status=status.HTTP_200_OK,
        )
