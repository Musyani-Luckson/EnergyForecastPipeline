from pathlib import Path
from dataclasses import asdict
from datetime import datetime, timezone

from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from algorithm.report.TimeSeriesQualityAnalyzer.TimeSeriesQualityAnalyzer import (
    TimeSeriesQualityAnalyzer,
)

from utils.data_loader import load_dataset

from .models import Dataset


class UploadView(APIView):
    """
    Upload dataset and create RAW pipeline node.
    """

    ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsx"}

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response(
                {
                    "success": False,
                    "message": "No file was provided.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        extension = Path(uploaded_file.name).suffix.lower()

        if extension not in self.ALLOWED_EXTENSIONS:
            return Response(
                {
                    "success": False,
                    "message": f"Unsupported file format '{extension}'.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        timestamp = (
            datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
            .replace(":", "-")
        )

        stored_path = default_storage.save(
            f"datasets/raw/{timestamp}_{uploaded_file.name}",
            uploaded_file,
        )

        # -----------------------------
        # RAW NODE CREATION
        # -----------------------------
        node = Dataset.objects.create(
            name=uploaded_file.name,
            file_path=stored_path,
            file_size=uploaded_file.size,
            stage="RAW",
            instructions={},
            metadata={},
        )

        return Response(
            {
                "success": True,
                "message": "Dataset uploaded successfully.",
                "data": {
                    "id": node.id,
                    "run_id": node.run_id,
                    "stage": node.stage,
                    "file_path": node.file_path,
                    "size": node.file_size,
                    "created_at": node.created_at,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class DatasetReportView(APIView):
    """
    Generate dataset quality report for a pipeline node.
    """

    def post(self, request):
        node_id = request.data.get("dataset_id")

        if not node_id:
            return Response(
                {
                    "success": False,
                    "message": "dataset_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            node = Dataset.objects.get(id=node_id)

            loaded_dataset = load_dataset(node.file_path)
            dataframe = loaded_dataset["dataframe"]

            report = TimeSeriesQualityAnalyzer.extract(dataframe)

            # Store report inside node metadata (traceability)
            node.metadata = {"quality_report": asdict(report)}
            # for now we ignore the save report
            # node.save()

            return Response(
                {
                    "success": True,
                    "message": "Dataset quality report generated successfully.",
                    "data": asdict(report),
                },
                status=status.HTTP_200_OK,
            )

        except Dataset.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": f"Dataset node '{node_id}' not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Failed to generate dataset report.",
                    "error": str(e),
                    "data": None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
