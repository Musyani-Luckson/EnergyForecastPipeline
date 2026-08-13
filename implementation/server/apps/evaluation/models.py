"""Evaluation domain: accuracy metrics for a completed forecast."""
from __future__ import annotations

from django.db import models
from django.db.models import Q


class EvaluationMetric(models.Model):
    """Accuracy metrics computed for a single forecast against holdout data."""

    forecast = models.OneToOneField(
        "forecasting.Forecast",
        on_delete=models.CASCADE,
        related_name="evaluation",
    )
    rmse = models.DecimalField(max_digits=14, decimal_places=6)
    mae = models.DecimalField(max_digits=14, decimal_places=6)
    mape = models.DecimalField(max_digits=9, decimal_places=4, null=True, blank=True)
    r_squared = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Evaluation Metric"
        verbose_name_plural = "Evaluation Metrics"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(rmse__gte=0), name="rmse_non_negative"),
            models.CheckConstraint(condition=Q(mae__gte=0), name="mae_non_negative"),
            models.CheckConstraint(
                condition=Q(mape__isnull=True) | Q(mape__gte=0),
                name="mape_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["created_at"], name="metric_created_idx"),
        ]

    def __str__(self) -> str:
        return f"Forecast #{self.forecast_id}: RMSE={self.rmse}, MAE={self.mae}"
