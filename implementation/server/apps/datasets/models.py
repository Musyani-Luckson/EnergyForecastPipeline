"""Dataset domain: one record per uploaded source dataset."""
from __future__ import annotations

from django.conf import settings
from django.db import models


class Dataset(models.Model):
    """A single dataset uploaded by a user; the pipeline's entry point."""

    class Status(models.TextChoices):
        UPLOADED = "uploaded", "Uploaded"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        ARCHIVED = "archived", "Archived"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="datasets",
    )
    dataset_name = models.CharField(max_length=255)
    original_filename = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UPLOADED,
        db_index=True,
    )
    current_version = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Dataset"
        verbose_name_plural = "Datasets"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"], name="dataset_user_status_idx"),
            models.Index(fields=["created_at"], name="dataset_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.dataset_name} (v{self.current_version})"
