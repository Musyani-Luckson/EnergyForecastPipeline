"""Helpers for creating immutable DatasetVersion artifacts."""
import hashlib
from datetime import datetime, timezone

import pandas as pd
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from utils.data_loader import load_dataset

from apps.processing.models import DatasetVersion, ProcessingJob, Stage

DATE_COLUMN = "Date"
VALUE_COLUMN = "Daily_kWh"


def _timestamp() -> str:
    return (
        datetime.now(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
        .replace(":", "-")
    )


def load_version_df(version: DatasetVersion) -> pd.DataFrame:
    """Load a version's on-disk file into a dataframe."""
    return load_dataset(version.file_path)["dataframe"]


def load_version_series(
    version: DatasetVersion,
    value_column: str = VALUE_COLUMN,
    date_column: str = DATE_COLUMN,
) -> pd.Series:
    """Load a version's value column as a date-indexed Series."""
    df = load_dataset(version.file_path)["dataframe"]

    if value_column not in df.columns:
        raise ValueError(
            f"Column '{value_column}' not found. Available: {list(df.columns)}"
        )

    if date_column in df.columns:
        df[date_column] = pd.to_datetime(df[date_column])
        df = df.set_index(date_column).sort_index()

    series = df[value_column].astype(float)
    if series.dropna().empty:
        raise ValueError(f"Column '{value_column}' contains no usable values.")
    return series


def next_version(
    source: DatasetVersion,
    stage: str,
    df: pd.DataFrame,
    subdir: str,
) -> DatasetVersion:
    """
    Persist `df` as a new immutable DatasetVersion in the same
    ProcessingJob, incrementing the version number and advancing
    the job's current stage.
    """
    csv = df.to_csv(index=False).encode("utf-8")
    name = source.dataset.original_filename
    stored_path = default_storage.save(
        f"datasets/{subdir}/{_timestamp()}_{name}",
        ContentFile(csv),
    )

    last = source.processing_job.versions.order_by("-version_number").first()
    version_number = (last.version_number if last else 0) + 1

    version = DatasetVersion.objects.create(
        processing_job=source.processing_job,
        dataset=source.dataset,
        version_number=version_number,
        stage=stage,
        file_path=stored_path,
        file_size=len(csv),
        record_count=len(df),
        checksum=hashlib.sha256(csv).hexdigest(),
    )

    job = source.processing_job
    job.current_stage = stage
    if job.status == ProcessingJob.Status.PENDING:
        job.status = ProcessingJob.Status.RUNNING
    job.save(update_fields=["current_stage", "status", "updated_at"])

    return version
