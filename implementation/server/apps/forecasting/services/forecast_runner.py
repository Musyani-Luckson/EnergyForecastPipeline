import threading
import time
from decimal import Decimal

import pandas as pd
from django.db import close_old_connections, transaction
from django.utils import timezone

from algorithm.forecastEngine.ForecastEngine import ForecastEngine

from apps.processing.models import DatasetVersion, ProcessingJob, Stage
from apps.processing.services import load_version_series, next_version, VALUE_COLUMN
from apps.forecasting.models import Forecast, ForecastValue


def _dec(value, places: int) -> Decimal:
    return Decimal(str(round(float(value), places)))


def detect_peaks(values: list) -> list:
    """FR9: a step is a peak when >= 1 std above the forecast mean."""
    if not values:
        return []
    n = len(values)
    mean = sum(values) / n
    std = (sum((v - mean) ** 2 for v in values) / n) ** 0.5
    threshold = mean + std
    return [
        {"step": i, "value": v}
        for i, v in enumerate(values, start=1)
        if std > 0 and v >= threshold
    ]


class ForecastRunner:
    """
    Coordinates a forecast run on the normalized schema.

    Run status lives on the ProcessingJob (status + current_stage);
    results are persisted as a Forecast + ForecastValue rows, plus a
    FORECAST DatasetVersion for the output file. No JSON metadata,
    and no accuracy metrics: the fit uses 100% of the series, so
    there is no holdout to score.
    """

    @classmethod
    def run(cls, source_version: DatasetVersion, background: bool = False) -> ProcessingJob:
        job = source_version.processing_job
        job.status = ProcessingJob.Status.RUNNING
        job.current_stage = Stage.FORECAST
        job.started_at = timezone.now()
        job.error_message = ""
        job.progress_phase = "starting"
        job.progress_done = 0
        job.progress_total = 0
        job.progress_candidate = ""
        job.progress_best = ""
        job.progress_best_aic = None
        job.save(update_fields=[
            "status", "current_stage", "started_at", "error_message",
            "progress_phase", "progress_done", "progress_total",
            "progress_candidate", "progress_best", "progress_best_aic", "updated_at",
        ])

        if background:
            threading.Thread(
                target=cls._execute, args=(source_version.pk,), daemon=True
            ).start()
        else:
            cls._execute(source_version.pk)
            job.refresh_from_db()

        return job

    # Minimum interval between progress writes, in seconds. The client
    # polls far slower than the search fits models, so writing more often
    # than this cannot reach the interface - it only costs UPDATEs.
    PROGRESS_INTERVAL_S = 0.4

    @staticmethod
    def _order_key(candidate) -> str:
        """Compact 'p,d,q,P,D,Q,s' encoding of a candidate's orders."""
        if not candidate:
            return ""
        return ",".join(
            str(int(v))
            for v in list(candidate.get("order", [])) + list(candidate.get("seasonal_order", []))
        )

    @classmethod
    def _progress_writer(cls, job: ProcessingJob):
        """
        Build the callback the engine reports through, persisting the
        phase, step counts, the candidate being fitted and the running
        leader, so the status endpoint can serve live progress.

        Writes are throttled on elapsed time rather than step count, so
        the cost stays bounded however large the search space is, while
        the feed stays fresher than the client's poll interval. Phase
        changes and the final step always write.
        """
        state = {"at": 0.0}

        def report(phase, done=None, total=None, evaluated=None, best=None):
            done = int(done or 0)
            total = int(total or 0)

            now = time.monotonic()
            forced = phase != job.progress_phase or (total and done == total)
            if not forced and now - state["at"] < cls.PROGRESS_INTERVAL_S:
                return
            state["at"] = now

            fields = ["progress_phase", "progress_done", "progress_total", "updated_at"]
            job.progress_phase = phase
            job.progress_done = done
            job.progress_total = total

            if evaluated is not None:
                job.progress_candidate = cls._order_key(evaluated)
                fields.append("progress_candidate")
            if best is not None:
                job.progress_best = cls._order_key(best)
                job.progress_best_aic = best.get("aic")
                fields += ["progress_best", "progress_best_aic"]

            job.save(update_fields=fields)

        return report

    @classmethod
    def _execute(cls, source_version_id: int) -> None:
        close_old_connections()
        try:
            source = DatasetVersion.objects.select_related("processing_job", "dataset").get(
                pk=source_version_id
            )
        except DatasetVersion.DoesNotExist:
            close_old_connections()
            return

        job = source.processing_job
        started = time.perf_counter()
        try:
            series = load_version_series(source)
            engine = ForecastEngine()  # contract defaults (30-day, s auto, 95% CI)
            result = engine.run_forecast(
                series, progress_callback=cls._progress_writer(job)
            )
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            cls._persist(source, job, series, result, elapsed_ms)
        except Exception as exc:
            job.status = ProcessingJob.Status.FAILED
            job.error_message = str(exc)
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "error_message", "completed_at", "updated_at"])
        finally:
            close_old_connections()

    @classmethod
    def _persist(cls, source, job, series, result, elapsed_ms) -> Forecast:
        fc = result["forecast"]
        values = fc["values"]
        lower = fc["lower_bound"]
        upper = fc["upper_bound"]
        order = fc["order"]                # [p, d, q]
        seasonal = fc["seasonal_order"]    # [P, D, Q, s]

        # Forecast dates: continue daily from the last historical date.
        if isinstance(series.index, pd.DatetimeIndex) and len(series.index):
            last_date = series.index.max()
        else:
            last_date = pd.Timestamp(timezone.now().date())
        dates = [(last_date + pd.Timedelta(days=i + 1)).date() for i in range(len(values))]

        # FORECAST output file → a FORECAST DatasetVersion.
        frame = pd.DataFrame(
            {
                "Date": dates,
                VALUE_COLUMN: values,
                "lower_bound": lower,
                "upper_bound": upper,
            }
        )
        forecast_version = next_version(source, Stage.FORECAST, frame, "forecast")

        with transaction.atomic():
            forecast = Forecast.objects.create(
                processing_job=job,
                dataset=job.dataset,
                source_dataset_version=source,
                p=order[0], d=order[1], q=order[2],
                seasonal_p=seasonal[0], seasonal_d=seasonal[1],
                seasonal_q=seasonal[2], seasonal_period=seasonal[3],
                aic=fc.get("aic"), bic=fc.get("bic"),
                forecast_horizon=len(values),
                execution_time_ms=elapsed_ms,
            )

            ForecastValue.objects.bulk_create([
                ForecastValue(
                    forecast=forecast,
                    forecast_date=dates[i],
                    predicted_value=_dec(values[i], 4),
                    lower_confidence=_dec(lower[i], 4),
                    upper_confidence=_dec(upper[i], 4),
                )
                for i in range(len(values))
            ])

            # No EvaluationMetric is written here. The model is fitted on 100%
            # of the series, so there is no held-out window to score against.
            # Accuracy belongs to a separate backtesting / rolling-origin
            # process, which must not shorten the operational forecast.

            job.status = ProcessingJob.Status.COMPLETED
            job.current_stage = Stage.FORECAST
            job.completed_at = timezone.now()
            job.execution_time_ms = elapsed_ms
            job.progress_phase = "complete"
            job.progress_done = job.progress_total
            job.save(update_fields=[
                "status", "current_stage", "completed_at", "execution_time_ms",
                "progress_phase", "progress_done", "updated_at",
            ])

        return forecast
