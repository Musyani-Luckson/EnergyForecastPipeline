from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from algorithm.forecastEngine.stationarity.StationarityEngine import StationarityEngine

from apps.processing.models import DatasetVersion
from apps.processing.services import load_version_series


class SaveView(APIView):
    """
    Validate that a DatasetVersion is stationary and therefore
    forecast-ready. Readiness is derived from the ADF test, not
    stored as a flag.
    """

    def post(self, request):
        version_id = request.data.get("dataset_id")

        if not version_id:
            return Response(
                {"success": False, "message": "dataset_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            version = DatasetVersion.objects.get(id=version_id)
            report = StationarityEngine.analyze(load_version_series(version))
        except DatasetVersion.DoesNotExist:
            return Response(
                {"success": False, "message": f"Dataset version {version_id} not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"success": False, "message": str(e), "data": None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not report["is_stationary"]:
            return Response(
                {
                    "success": False,
                    "message": f"Dataset is not stationary (p={report['p_value']:.4f}). "
                               "Apply differencing first.",
                    "data": {"stationarity": report},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "Dataset is forecast-ready.",
                "data": {
                    "dataset_id": version.id,
                    "run_id": str(version.processing_job_id),
                    "forecast_ready": True,
                },
            }
        )
