"""Forecasting domain: SARIMA runs and their per-day predicted values."""
from __future__ import annotations

from django.db import models
from django.db.models import F, Q


class Forecast(models.Model):
    """A fitted SARIMA model and its run-level metadata."""

    processing_job = models.ForeignKey(
        "processing.ProcessingJob",
        on_delete=models.CASCADE,
        related_name="forecasts",
    )
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="forecasts",
    )
    stationary_dataset_version = models.ForeignKey(
        "processing.DatasetVersion",
        on_delete=models.PROTECT,
        related_name="forecasts",
    )

    # SARIMA order (p, d, q)(P, D, Q, s).
    # Seasonal terms use `seasonal_*` names: MySQL column names are
    # case-insensitive, so `p` and `P` cannot coexist as columns.
    p = models.PositiveSmallIntegerField()
    d = models.PositiveSmallIntegerField()
    q = models.PositiveSmallIntegerField()
    seasonal_p = models.PositiveSmallIntegerField()
    seasonal_d = models.PositiveSmallIntegerField()
    seasonal_q = models.PositiveSmallIntegerField()
    seasonal_period = models.PositiveSmallIntegerField()

    aic = models.FloatField(null=True, blank=True)
    bic = models.FloatField(null=True, blank=True)
    forecast_horizon = models.PositiveIntegerField(default=30)
    execution_time_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Forecast"
        verbose_name_plural = "Forecasts"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(forecast_horizon__gte=1),
                name="forecast_horizon_positive",
            ),
            models.CheckConstraint(
                condition=Q(seasonal_period__gte=1),
                name="seasonal_period_positive",
            ),
        ]
        indexes = [
            models.Index(fields=["dataset", "created_at"], name="forecast_dataset_idx"),
            models.Index(fields=["processing_job"], name="forecast_job_idx"),
            models.Index(fields=["created_at"], name="forecast_created_idx"),
        ]

    @property
    def order(self) -> list[int]:
        return [self.p, self.d, self.q]

    @property
    def seasonal_order(self) -> list[int]:
        return [self.seasonal_p, self.seasonal_d, self.seasonal_q, self.seasonal_period]

    def __str__(self) -> str:
        return (
            f"SARIMA({self.p},{self.d},{self.q})"
            f"({self.seasonal_p},{self.seasonal_d},{self.seasonal_q})"
            f"{self.seasonal_period}"
        )


class ForecastValue(models.Model):
    """One predicted day of a forecast, with its confidence interval."""

    forecast = models.ForeignKey(
        Forecast,
        on_delete=models.CASCADE,
        related_name="values",
    )
    forecast_date = models.DateField(db_index=True)
    predicted_value = models.DecimalField(max_digits=14, decimal_places=4)
    lower_confidence = models.DecimalField(max_digits=14, decimal_places=4)
    upper_confidence = models.DecimalField(max_digits=14, decimal_places=4)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Forecast Value"
        verbose_name_plural = "Forecast Values"
        ordering = ["forecast", "forecast_date"]
        constraints = [
            models.UniqueConstraint(
                fields=["forecast", "forecast_date"],
                name="uniq_value_per_forecast_date",
            ),
            models.CheckConstraint(
                condition=Q(upper_confidence__gte=F("lower_confidence")),
                name="value_upper_gte_lower",
            ),
            models.CheckConstraint(
                condition=Q(predicted_value__gte=0),
                name="value_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["forecast", "forecast_date"], name="value_forecast_date_idx"),
            models.Index(fields=["forecast_date"], name="value_date_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.forecast_date}: {self.predicted_value}"
