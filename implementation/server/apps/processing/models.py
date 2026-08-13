"""Processing domain: pipeline runs, immutable versions, and stage logs."""
from __future__ import annotations

from django.db import models
from django.db.models import F, Q


class Stage(models.TextChoices):
    """Immutable artifact stages produced along the pipeline."""

    RAW = "raw", "Raw"
    CLEANED = "cleaned", "Cleaned"
    OUTLIERS = "outliers", "Outliers"
    STATIONARY = "stationary", "Stationary"
    FORECAST = "forecast", "Forecast"


class ProcessingJob(models.Model):
    """One execution of the full preprocessing-to-forecast pipeline."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="processing_jobs",
    )
    job_name = models.CharField(max_length=255)
    current_stage = models.CharField(
        max_length=20,
        choices=Stage.choices,
        default=Stage.RAW,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    execution_time_ms = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Processing Job"
        verbose_name_plural = "Processing Jobs"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(started_at__isnull=True)
                    | Q(completed_at__isnull=True)
                    | Q(completed_at__gte=F("started_at"))
                ),
                name="job_completed_after_started",
            ),
        ]
        indexes = [
            models.Index(fields=["dataset", "status"], name="job_dataset_status_idx"),
            models.Index(fields=["status", "current_stage"], name="job_status_stage_idx"),
            models.Index(fields=["created_at"], name="job_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.job_name} [{self.get_status_display()}]"


class DatasetVersion(models.Model):
    """An immutable, on-disk dataset artifact produced by one stage."""

    processing_job = models.ForeignKey(
        ProcessingJob,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    stage = models.CharField(max_length=20, choices=Stage.choices, db_index=True)
    # Stored path only — never a FilePathField (which is a form-time chooser).
    file_path = models.CharField(max_length=500)
    file_size = models.PositiveBigIntegerField(default=0)
    record_count = models.PositiveIntegerField(default=0)
    checksum = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Dataset Version"
        verbose_name_plural = "Dataset Versions"
        ordering = ["processing_job", "version_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["processing_job", "version_number"],
                name="uniq_version_per_job",
            ),
            models.CheckConstraint(
                condition=Q(version_number__gte=1),
                name="version_number_positive",
            ),
        ]
        indexes = [
            models.Index(fields=["dataset", "stage"], name="version_dataset_stage_idx"),
            models.Index(fields=["created_at"], name="version_created_idx"),
        ]

    def __str__(self) -> str:
        return f"v{self.version_number} · {self.get_stage_display()}"


class PreprocessingLog(models.Model):
    """Per-stage preprocessing outcome, statistics, and diagnostics."""

    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    processing_job = models.ForeignKey(
        ProcessingJob,
        on_delete=models.CASCADE,
        related_name="preprocessing_logs",
    )
    dataset_version = models.ForeignKey(
        DatasetVersion,
        on_delete=models.CASCADE,
        related_name="preprocessing_logs",
    )
    stage = models.CharField(max_length=20, choices=Stage.choices, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUCCESS,
        db_index=True,
    )
    processing_time_ms = models.PositiveIntegerField(default=0)

    # Cleaning statistics
    missing_values_fixed = models.PositiveIntegerField(default=0)
    duplicate_rows_removed = models.PositiveIntegerField(default=0)
    invalid_rows_removed = models.PositiveIntegerField(default=0)

    # Outlier statistics (IQR)
    outliers_detected = models.PositiveIntegerField(default=0)
    outliers_imputed = models.PositiveIntegerField(default=0)
    iqr_lower = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    iqr_upper = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)

    # Stationarity statistics (ADF)
    adf_statistic = models.FloatField(null=True, blank=True)
    p_value = models.FloatField(null=True, blank=True)
    differencing_order = models.PositiveSmallIntegerField(null=True, blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Preprocessing Log"
        verbose_name_plural = "Preprocessing Logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["processing_job", "stage"], name="log_job_stage_idx"),
            models.Index(fields=["status"], name="log_status_idx"),
            models.Index(fields=["created_at"], name="log_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.get_stage_display()} · {self.get_status_display()}"
