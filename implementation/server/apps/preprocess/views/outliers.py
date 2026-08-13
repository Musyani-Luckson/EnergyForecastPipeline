import time
from decimal import Decimal

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.processing.models import DatasetVersion, PreprocessingLog, Stage
from apps.processing.services import load_version_df, next_version, VALUE_COLUMN

from algorithm.preprocess.outlierProcessing.IQRCleaner import IQRCleaner
from algorithm.preprocess.outlierProcessing.ZScoreCleaner import ZScoreCleaner


class OutlierDetectionView(APIView):
    """
    Stage: OUTLIERS. Applies IQR (or Z-score) anomaly detection +
    locality-based median imputation to a source DatasetVersion,
    writes a new OUTLIERS DatasetVersion, and records a
    PreprocessingLog with outlier statistics.
    """

    SUPPORTED_METHODS = ["iqr", "zscore"]

    def post(self, request):
        version_id = request.data.get("dataset_id")
        outlier_config = request.data.get("outlier", {})

        if not version_id:
            return Response(
                {"success": False, "message": "dataset_id is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(outlier_config, dict):
            return Response(
                {"success": False, "message": "outlier must be an object.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            source = DatasetVersion.objects.get(id=version_id)
        except DatasetVersion.DoesNotExist:
            return Response(
                {"success": False, "message": f"Dataset version {version_id} not found.", "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        # No method → pass through unchanged (no new version).
        if not outlier_config:
            return Response(
                {
                    "success": True,
                    "message": "No outlier method specified; dataset proceeds unchanged.",
                    "data": {"dataset_id": version_id, "cleaned_id": version_id,
                             "run_id": str(source.processing_job_id), "outlier_detection": False},
                },
                status=status.HTTP_200_OK,
            )

        method = (outlier_config.get("method") or "").lower().strip()
        if method not in self.SUPPORTED_METHODS:
            return Response(
                {
                    "success": False,
                    "message": f"Unsupported outlier method '{method}'. "
                               f"Supported: {', '.join(self.SUPPORTED_METHODS)}.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        started = time.perf_counter()
        df = load_version_df(source)

        if VALUE_COLUMN not in df.columns:
            return Response(
                {"success": False, "message": f"Column '{VALUE_COLUMN}' not found.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        series = df[VALUE_COLUMN]

        # IQR bounds + detected count for the log (contract 3.3.3).
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        detected = int(((series < lower) | (series > upper) | (series < 0)).sum())

        try:
            if method == "iqr":
                df[VALUE_COLUMN] = IQRCleaner.clean(series, strategy="local_median", window=7)
            else:  # zscore
                threshold = float(outlier_config.get("threshold", 3.0))
                if threshold <= 0:
                    raise ValueError("threshold must be greater than zero.")
                df[VALUE_COLUMN] = ZScoreCleaner.clean(
                    series, threshold=threshold, strategy="local_median", window=7
                )
        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc), "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        elapsed_ms = int((time.perf_counter() - started) * 1000)

        outlier_version = next_version(source, Stage.OUTLIERS, df, "outliers")

        PreprocessingLog.objects.create(
            processing_job=outlier_version.processing_job,
            dataset_version=outlier_version,
            stage=Stage.OUTLIERS,
            status=PreprocessingLog.Status.SUCCESS,
            processing_time_ms=elapsed_ms,
            outliers_detected=detected,
            outliers_imputed=detected,
            iqr_lower=Decimal(str(round(float(lower), 4))),
            iqr_upper=Decimal(str(round(float(upper), 4))),
            notes=f"{method.upper()} outlier detection, radius-7 local-median imputation.",
        )

        return Response(
            {
                "success": True,
                "message": f"Outlier detection completed using '{method}'.",
                "data": {
                    "source_id": source.id,
                    "cleaned_id": outlier_version.id,
                    "run_id": str(outlier_version.processing_job_id),
                    "stage": "OUTLIERS",
                    "file_path": outlier_version.file_path,
                    "outliers_detected": detected,
                },
            },
            status=status.HTTP_200_OK,
        )
