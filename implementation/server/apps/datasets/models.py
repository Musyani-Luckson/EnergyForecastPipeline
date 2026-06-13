import uuid
from django.db import models


class Dataset(models.Model):
    """
    Unified dataset entity.

    Replaces Dataset model entirely.

    Represents:
    RAW → CLEANED → OUTLIER → STATIONARY → FORECAST
    """

    STAGE_CHOICES = [
        ("RAW", "Raw"),
        ("CLEANED", "Cleaned"),
        ("OUTLIER", "Outlier"),
        ("STATIONARY", "Stationary"),
        ("FORECAST", "Forecast"),
    ]

    # -----------------------------
    # Experiment / Pipeline group
    # -----------------------------
    run_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )

    # -----------------------------
    # Identity
    # -----------------------------
    name = models.CharField(max_length=255)

    file_path = models.TextField()

    file_size = models.BigIntegerField(null=True, blank=True)

    # -----------------------------
    # Stage definition
    # -----------------------------
    stage = models.CharField(
        max_length=20,
        choices=STAGE_CHOICES,
        default="RAW",
        db_index=True,
    )

    # -----------------------------
    # Lineage (self-contained DAG)
    # -----------------------------
    has_dependency = models.BooleanField(default=False)

    dependency = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )

    # -----------------------------
    # Processing config
    # -----------------------------
    instructions = models.JSONField(default=dict, blank=True)

    # -----------------------------
    # Computed outputs / analytics
    # -----------------------------
    metadata = models.JSONField(default=dict, blank=True)

    # -----------------------------
    # Lifecycle control
    # -----------------------------
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "dataset_metadata"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["run_id"]),
            models.Index(fields=["stage"]),
            models.Index(fields=["dependency"]),
        ]

    def save(self, *args, **kwargs):
        self.has_dependency = self.dependency is not None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} | {self.stage} | {self.run_id}"
