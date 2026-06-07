from django.db import models

from apps.datasets.models import Dataset


class PreprocessDataset(models.Model):
    """
    Represents a single preprocessing stage.

    Example chain:

    Raw Dataset (#34)
            │
            ▼
    PreprocessDataset #1 (CLEANING)
            │
            ▼
    PreprocessDataset #2 (OUTLIER)
            │
            ▼
    PreprocessDataset #3 (STATIONARITY)
    """

    STAGE_CHOICES = [
        ("CLEANING", "Cleaning"),
        ("OUTLIER", "Outlier"),
        ("STATIONARITY", "Stationarity"),
    ]

    dataset = models.ForeignKey(
        Dataset,
        on_delete=models.CASCADE,
        related_name="preprocessing_stages",
        help_text="Original uploaded dataset.",
    )

    predecessor = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="successors",
        help_text="Previous preprocessing stage.",
    )

    stage = models.CharField(
        max_length=20,
        choices=STAGE_CHOICES,
    )

    file_path = models.TextField(
        help_text="Path to the generated dataset for this stage.",
    )

    instructions = models.JSONField(
        default=dict,
        blank=True,
        help_text="User-selected preprocessing instructions.",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Stage results, statistics, logs, and summaries.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "preprocess_dataset"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.stage} | " f"Dataset #{self.dataset_id} | " f"Stage #{self.id}"
