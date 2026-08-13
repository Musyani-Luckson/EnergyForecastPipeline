from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from algorithm.forecastEngine.differencing.DifferencingEngine import DifferencingEngine
from algorithm.forecastEngine.stationarity.StationarityEngine import StationarityEngine

from apps.processing.models import DatasetVersion, PreprocessingLog, Stage
from apps.processing.services import load_version_series, next_version, VALUE_COLUMN


class DifferencingView(APIView):
    """
    Apply differencing to a DatasetVersion, producing a STATIONARY
    DatasetVersion and recording a PreprocessingLog (differencing
    order + post-difference ADF stat/p-value).
    """

    def post(self, request):
        version_id = request.data.get("dataset_id")
        order = int(request.data.get("order", 1))
        seasonal_order = int(request.data.get("seasonal_order", 0))
        seasonal_period = int(request.data.get("seasonal_period", 7))

        if not version_id:
            return Response(
                {"success": False, "message": "dataset_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            source = DatasetVersion.objects.get(id=version_id)
            series = load_version_series(source)

            differenced = DifferencingEngine.apply(
                series,
                order=order,
                seasonal_order=seasonal_order,
                seasonal_period=seasonal_period,
            )
            report = StationarityEngine.analyze(differenced)

            frame = differenced.rename(VALUE_COLUMN).reset_index()
            stationary_version = next_version(source, Stage.STATIONARY, frame, "stationary")

            PreprocessingLog.objects.create(
                processing_job=stationary_version.processing_job,
                dataset_version=stationary_version,
                stage=Stage.STATIONARY,
                status=PreprocessingLog.Status.SUCCESS,
                adf_statistic=report["statistic"],
                p_value=report["p_value"],
                differencing_order=order,
                notes=f"Differencing d={order}, D={seasonal_order}, s={seasonal_period}.",
            )

            return Response(
                {
                    "success": True,
                    "message": "Differencing completed.",
                    "data": {
                        "source_id": source.id,
                        "stationary_id": stationary_version.id,
                        "run_id": str(stationary_version.processing_job_id),
                        "stage": "STATIONARY",
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
