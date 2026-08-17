import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone

import pandas as pd

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from algorithm.report.TimeSeriesQualityAnalyzer.TimeSeriesQualityAnalyzer import (
    TimeSeriesQualityAnalyzer,
)
from utils.data_loader import load_dataset

from .models import Dataset
from apps.processing.models import ProcessingJob, DatasetVersion, Stage
from apps.processing.services import DIFFERENCED_VALUE_COLUMN, resolve_value_column


# Client-facing stage keys (uppercase) in pipeline order.
STAGE_KEYS = ["RAW", "CLEANED", "OUTLIERS", "STATIONARY", "FORECAST"]


def _timestamp() -> str:
    return (
        datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
        .replace(":", "-")
    )


class UploadView(APIView):
    """
    Upload a dataset: create the Dataset, its ProcessingJob (run),
    and the RAW DatasetVersion (immutable stage-0 artifact).
    """

    ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsx"}

    def post(self, request):
        uploaded_file = request.FILES.get("file")

        if not uploaded_file:
            return Response(
                {"success": False, "message": "No file was provided.", "data": None},
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

        content = uploaded_file.read()
        checksum = hashlib.sha256(content).hexdigest()

        stored_path = default_storage.save(
            f"datasets/raw/{_timestamp()}_{uploaded_file.name}",
            ContentFile(content),
        )

        try:
            record_count = load_dataset(stored_path)["row_count"]
        except Exception as exc:
            return Response(
                {
                    "success": False,
                    "message": f"Dataset validation failed: {exc}",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        dataset = Dataset.objects.create(
            user=request.user,
            dataset_name=uploaded_file.name,
            original_filename=uploaded_file.name,
            status=Dataset.Status.UPLOADED,
            current_version=1,
        )
        job = ProcessingJob.objects.create(
            dataset=dataset,
            job_name=f"{uploaded_file.name} pipeline",
            current_stage=Stage.RAW,
            status=ProcessingJob.Status.PENDING,
        )
        version = DatasetVersion.objects.create(
            processing_job=job,
            dataset=dataset,
            version_number=1,
            stage=Stage.RAW,
            file_path=stored_path,
            file_size=len(content),
            record_count=record_count,
            checksum=checksum,
        )

        return Response(
            {
                "success": True,
                "message": "Dataset uploaded successfully.",
                "data": {
                    # `id` = the version node the client threads into cleaning;
                    # `run_id` = the ProcessingJob grouping the pipeline.
                    "id": version.id,
                    "run_id": str(job.id),
                    "dataset_id": dataset.id,
                    "stage": "RAW",
                    "record_count": record_count,
                    "file_path": stored_path,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class DatasetReportView(APIView):
    """
    Compute a data-quality report for any DatasetVersion (raw after
    upload, or a preprocessed version). Stateless - computed on
    demand from the version's file, never persisted.
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
        except DatasetVersion.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": f"Dataset version '{version_id}' not found.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            dataframe = load_dataset(version.file_path)["dataframe"]
            # A differenced version stores change rather than consumption, so
            # the report is told which it is holding; otherwise its ordinary
            # negative changes would be reported as invalid energy readings.
            value_column = resolve_value_column(dataframe)
            report = TimeSeriesQualityAnalyzer.extract(
                dataframe,
                value_col=value_column,
                is_differenced=value_column == DIFFERENCED_VALUE_COLUMN,
            )
            from dataclasses import asdict

            # Normalize numpy scalar types to native Python for JSON.
            clean_report = json.loads(
                json.dumps(
                    asdict(report),
                    default=lambda o: o.item() if hasattr(o, "item") else str(o),
                )
            )
        except Exception as exc:
            return Response(
                {
                    "success": False,
                    "message": "Failed to generate dataset report.",
                    "error": str(exc),
                    "data": None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "success": True,
                "message": "Dataset quality report generated successfully.",
                "data": clean_report,
            },
            status=status.HTTP_200_OK,
        )


class DatasetPipelineView(APIView):
    """
    Derive the pipeline DAG projection the client expects
    ({run_id, pipeline:{RAW,CLEANED,OUTLIERS,STATIONARY,FORECAST}})
    dynamically from ProcessingJob + DatasetVersion - no stored DAG.
    """

    def get(self, request):
        jobs = (
            ProcessingJob.objects.select_related("dataset")
            .prefetch_related("versions")
            .order_by("created_at")
        )

        runs = []
        for job in jobs:
            pipeline = {key: None for key in STAGE_KEYS}
            ordered = sorted(job.versions.all(), key=lambda v: v.version_number)
            prev_id = None
            for version in ordered:
                key = version.stage.upper()
                if key in pipeline:
                    pipeline[key] = {
                        "id": version.id,
                        "name": job.dataset.dataset_name,
                        "stage": key,
                        "dependency": prev_id,
                        "metadata": {},
                        "instructions": {},
                        "created_at": version.created_at,
                    }
                    prev_id = version.id

            runs.append({"run_id": str(job.id), "pipeline": pipeline})

        return Response({"success": True, "data": runs})


class DatasetSeriesView(APIView):
    """
    Per-day observations for one or more DatasetVersions, so the client can
    overlay the pipeline stages on a single chart.

    Stateless: read from each version's file, never persisted. Pass a single
    `dataset_id`, or `dataset_ids` as a comma-separated list to fetch several
    stages in one round trip.

    Note that STATIONARY values are differenced - period-over-period changes,
    not kWh - so callers must plot that stage on its own axis. The `stage` on
    each entry is what tells them apart.
    """

    def get(self, request):
        raw_ids = request.query_params.get("dataset_ids") or request.query_params.get("dataset_id")

        if not raw_ids:
            return Response(
                {"success": False, "message": "dataset_id or dataset_ids is required.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            version_ids = [int(v) for v in str(raw_ids).split(",") if str(v).strip()]
        except ValueError:
            return Response(
                {"success": False, "message": "dataset_ids must be integers.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not version_ids:
            return Response(
                {"success": False, "message": "No dataset ids supplied.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        versions = {v.id: v for v in DatasetVersion.objects.filter(id__in=version_ids)}

        missing = [i for i in version_ids if i not in versions]
        if missing:
            return Response(
                {
                    "success": False,
                    "message": f"Dataset version(s) not found: {missing}.",
                    "data": None,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        results = []
        for version_id in version_ids:
            version = versions[version_id]
            try:
                df = load_dataset(version.file_path)["dataframe"].copy()
                # Differenced versions carry their own column; resolving it
                # keeps the stationary layer plottable on the evolution chart.
                column = resolve_value_column(df)
                df["Date"] = pd.to_datetime(df["Date"])
                df = df.dropna(subset=[column]).sort_values("Date")
                points = [
                    {"date": d.strftime("%Y-%m-%d"), "value": float(v)}
                    for d, v in zip(df["Date"], df[column])
                ]
            except Exception:
                points = []

            results.append(
                {
                    "dataset_id": version.id,
                    # Stage is stored lowercase; the client contract is the
                    # uppercase key, as in DatasetPipelineView.
                    "stage": version.stage.upper(),
                    "points": points,
                }
            )

        return Response({"success": True, "message": "Series retrieved.", "data": results})
