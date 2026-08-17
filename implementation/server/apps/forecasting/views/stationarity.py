from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from algorithm.forecastEngine.stationarity.StationarityEngine import StationarityEngine

from apps.processing.models import DatasetVersion, PreprocessingLog, Stage
from apps.processing.services import load_version_series


class StationarityView(APIView):
    """
    ADF stationarity test on a DatasetVersion. Records a
    PreprocessingLog (adf_statistic, p_value) - the diagnostic
    lives in structured columns, not a JSON blob.
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
            series = load_version_series(version)
            report = StationarityEngine.analyze(series)

            PreprocessingLog.objects.create(
                processing_job=version.processing_job,
                dataset_version=version,
                stage=Stage.STATIONARY,
                status=PreprocessingLog.Status.SUCCESS,
                adf_statistic=report["statistic"],
                p_value=report["p_value"],
                notes="ADF stationarity test.",
            )

            return Response(
                {
                    "success": True,
                    "message": "Stationarity analysis completed.",
                    "data": {
                        "dataset_id": version.id,
                        "run_id": str(version.processing_job_id),
                        "stationarity": report,
                    },
                }
            )

        except DatasetVersion.DoesNotExist:
            return Response(
                {"success": False, "message": f"Dataset version {version_id} not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e), "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"success": False, "message": str(e), "data": None},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
