"""Reports domain: exported forecast reports stored on disk."""
from __future__ import annotations

from django.db import models


class Report(models.Model):
    """A generated, downloadable report for a forecast run."""

    class ReportType(models.TextChoices):
        PDF = "pdf", "PDF"
        CSV = "csv", "CSV"
        JSON = "json", "JSON"

    processing_job = models.ForeignKey(
        "processing.ProcessingJob",
        on_delete=models.CASCADE,
        related_name="reports",
    )
    forecast = models.ForeignKey(
        "forecasting.Forecast",
        on_delete=models.CASCADE,
        related_name="reports",
    )
    report_type = models.CharField(
        max_length=10,
        choices=ReportType.choices,
        db_index=True,
    )
    # Stored path only - never a FilePathField (form-time chooser).
    file_path = models.CharField(max_length=500)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Report"
        verbose_name_plural = "Reports"
        ordering = ["-generated_at"]
        indexes = [
            models.Index(fields=["forecast", "report_type"], name="report_forecast_type_idx"),
            models.Index(fields=["processing_job"], name="report_job_idx"),
            models.Index(fields=["generated_at"], name="report_generated_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.get_report_type_display()} · forecast #{self.forecast_id}"
