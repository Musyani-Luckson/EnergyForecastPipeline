from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


from datetime import datetime, timezone

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from apps.datasets.models import Dataset

from utils.data_loader import load_dataset

from algorithm.preprocess.outlierProcessing.IQRCleaner import IQRCleaner
from algorithm.preprocess.outlierProcessing.ZScoreCleaner import ZScoreCleaner


class OutlierDetectionView(APIView):
    """
    Outlier Detection Endpoint

    Supported Methods:
    - iqr
    - zscore

    Request Body:

    {
        "dataset_id": 1,
        "outlier": {}
    }

    No outlier detection will be performed when the
    outlier object is empty.

    Example:

    {
        "dataset_id": 1,
        "outlier": {
            "method": "iqr"
        }
    }

    {
        "dataset_id": 1,
        "outlier": {
            "method": "zscore",
            "threshold": 3.0
        }
    }
    """

    SUPPORTED_METHODS = ["iqr", "zscore"]

    def post(self, request):

        # --------------------------------------------------
        # Dataset Validation
        # --------------------------------------------------

        dataset_id = request.data.get("dataset_id")

        if not dataset_id:
            return Response(
                {
                    "success": False,
                    "message": "dataset_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------
        # Outlier Configuration
        # --------------------------------------------------

        outlier_config = request.data.get("outlier", {})

        if not isinstance(outlier_config, dict):
            return Response(
                {
                    "success": False,
                    "message": "outlier must be an object.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------
        # No Outlier Detection Requested
        # --------------------------------------------------

        if not outlier_config:

            return Response(
                {
                    "success": True,
                    "message": (
                        "No outlier detection method specified. "
                        "Dataset will proceed unchanged."
                    ),
                    "data": {
                        "dataset_id": dataset_id,
                        "outlier_detection": False,
                        "method": None,
                    },
                },
                status=status.HTTP_200_OK,
            )

        # --------------------------------------------------
        # Method Validation
        # --------------------------------------------------

        method = outlier_config.get("method")

        if not method:
            return Response(
                {
                    "success": False,
                    "message": (
                        "outlier.method is required when "
                        "outlier configuration is provided."
                    ),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        method = method.lower().strip()

        if method not in self.SUPPORTED_METHODS:
            return Response(
                {
                    "success": False,
                    "message": (
                        f"Unsupported outlier method '{method}'. "
                        f"Supported methods are: "
                        f"{', '.join(self.SUPPORTED_METHODS)}."
                    ),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --------------------------------------------------
        # IQR Configuration
        # --------------------------------------------------

        if method == "iqr":

            source = Dataset.objects.get(id=dataset_id)
            df = load_dataset(source.file_path)["dataframe"]

            df["Daily_kWh"] = IQRCleaner.clean(
                df["Daily_kWh"], strategy="local_median", window=3
            )

            # -----------------------------
            # Save new dataset file
            # -----------------------------
            timestamp = (
                datetime.now(timezone.utc)
                .isoformat()
                .replace("+00:00", "Z")
                .replace(":", "-")
            )

            output_path = f"datasets/outliers/{timestamp}_{source.name}"

            csv_buffer = df.to_csv(index=False).encode("utf-8")

            stored_path = default_storage.save(
                output_path,
                ContentFile(csv_buffer),
            )

            # -----------------------------
            # Create NEW dataset node (NO MUTATION)
            # -----------------------------
            outliered_cleaned_node = Dataset.objects.create(
                run_id=source.run_id,  # propagate pipeline group
                name=source.name,
                file_path=stored_path,
                file_size=len(csv_buffer),
                stage="OUTLIER",
                dependency=source,
                instructions="IQR-based outlier detection applied to Daily_kWh column. ",
                metadata={
                    "applied_steps": ["iqr_outlier_detection"],
                    "dependency_notes": ["IQR-based outlier detection selected. "],
                    "rows": len(df),
                    "columns": list(df.columns),
                },
            )

            result = {
                "source_id": source.id,
                "cleaned_id": outliered_cleaned_node.id,
                "run_id": str(source.run_id),
                "stage": outliered_cleaned_node.stage,
                "file_path": stored_path,
                # "applied_steps": outliered_cleaned_node.applied,
            }

        # --------------------------------------------------
        # Z-Score Configuration
        # --------------------------------------------------

        elif method == "zscore":

            threshold = outlier_config.get("threshold", 3.0)

            try:
                threshold = float(threshold)
            except (TypeError, ValueError):
                return Response(
                    {
                        "success": False,
                        "message": ("threshold must be a numeric value."),
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if threshold <= 0:
                return Response(
                    {
                        "success": False,
                        "message": ("threshold must be greater than zero."),
                        "data": None,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            source = Dataset.objects.get(id=dataset_id)
            df = load_dataset(source.file_path)["dataframe"]

            df["Daily_kWh"] = ZScoreCleaner.clean(
                df["Daily_kWh"], threshold=3.0, strategy="local_median", window=3
            )

            # -----------------------------
            # Save new dataset file
            # -----------------------------
            timestamp = (
                datetime.now(timezone.utc)
                .isoformat()
                .replace("+00:00", "Z")
                .replace(":", "-")
            )

            output_path = f"datasets/outliers/{timestamp}_{source.name}"

            csv_buffer = df.to_csv(index=False).encode("utf-8")

            stored_path = default_storage.save(
                output_path,
                ContentFile(csv_buffer),
            )

            # -----------------------------
            # Create NEW dataset node (NO MUTATION)
            # -----------------------------
            outliered_cleaned_node = Dataset.objects.create(
                run_id=source.run_id,  # propagate pipeline group
                name=source.name,
                file_path=stored_path,
                file_size=len(csv_buffer),
                stage="OUTLIER",
                dependency=source,
                instructions="IQR-based outlier detection applied to Daily_kWh column. ",
                metadata={
                    "applied_steps": ["iqr_outlier_detection"],
                    "dependency_notes": ["IQR-based outlier detection selected. "],
                    "rows": len(df),
                    "columns": list(df.columns),
                },
            )

            result = {
                "source_id": source.id,
                "cleaned_id": outliered_cleaned_node.id,
                "run_id": str(source.run_id),
                "stage": outliered_cleaned_node.stage,
                "file_path": stored_path,
                # "applied_steps": outliered_cleaned_node.applied,
            }

        # --------------------------------------------------
        # Success Response
        # --------------------------------------------------

        return Response(
            {
                "success": True,
                "message": (
                    f"Outlier detection configuration validated "
                    f"successfully using '{method}'."
                ),
                "data": result,
            },
            status=status.HTTP_200_OK,
        )
