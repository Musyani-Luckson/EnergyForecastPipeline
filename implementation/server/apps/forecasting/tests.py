import time
import numpy as np
import pandas as pd

from django.test import TestCase

from algorithm.forecastEngine.stationarity.StationarityEngine import StationarityEngine
from algorithm.forecastEngine.differencing.DifferencingEngine import DifferencingEngine
from algorithm.forecastEngine.SARIMA.SARIMAEngine import SARIMAEngine
from algorithm.forecastEngine.ForecastEngine import ForecastEngine

from apps.forecasting.services.forecast_runner import detect_peaks, ForecastRunner


def seasonal_series(n=60, seed=42) -> pd.Series:
    rng = np.random.default_rng(seed)
    t = np.arange(n)
    return pd.Series(
        100 + 0.5 * t + 10 * np.sin(2 * np.pi * t / 12) + rng.normal(0, 2, n)
    )


class StationarityEngineTests(TestCase):
    def test_trending_series_is_not_stationary(self):
        report = StationarityEngine.analyze(seasonal_series())
        self.assertFalse(report["is_stationary"])

    def test_white_noise_is_stationary(self):
        rng = np.random.default_rng(1)
        report = StationarityEngine.analyze(pd.Series(rng.normal(0, 1, 100)))
        self.assertTrue(report["is_stationary"])

    def test_short_series_rejected(self):
        with self.assertRaises(ValueError):
            StationarityEngine.analyze(pd.Series([1.0, 2.0, 3.0]))


class DifferencingEngineTests(TestCase):
    def test_apply_reduces_length(self):
        series = seasonal_series()
        self.assertEqual(len(DifferencingEngine.apply(series, order=1)), len(series) - 1)

    def test_recommend_finds_stationary_orders(self):
        result = DifferencingEngine.recommend(seasonal_series())
        self.assertIsNotNone(result["recommended_d"])
        self.assertTrue(result["stationarity"]["is_stationary"])


class SARIMAEngineTests(TestCase):
    def test_split(self):
        train, holdout = SARIMAEngine.split(seasonal_series(), 12)
        self.assertEqual(len(train), 48)
        self.assertEqual(len(holdout), 12)

    def test_minimum_observations_enforced(self):
        with self.assertRaises(ValueError):
            SARIMAEngine.fit(seasonal_series(20), (1, 0, 0), (0, 0, 0, 7))

    def test_clip_to_zero(self):
        declining = pd.Series([100.0 - 4 * i for i in range(30)])
        forecast = SARIMAEngine.forecast(
            declining, order=(0, 1, 0), seasonal_order=(0, 0, 0, 7), horizon=10
        )
        self.assertTrue(all(v >= 0 for v in forecast["values"]))
        self.assertTrue(all(v >= 0 for v in forecast["lower_bound"]))


class ForecastEngineTests(TestCase):
    def test_contract_defaults(self):
        engine = ForecastEngine()
        self.assertEqual(engine.configuration["forecast_horizon"], 30)
        self.assertEqual(engine.configuration["confidence"], 0.95)
        self.assertNotIn("holdout", engine.configuration)
        self.assertEqual(engine.configuration["seasonality"], "auto")

    def test_unsupported_algorithm_rejected(self):
        with self.assertRaises(ValueError):
            ForecastEngine({"algorithm": "PROPHET"})


class PeakDetectionTests(TestCase):
    def test_detects_high_demand_steps(self):
        peaks = detect_peaks([10.0] * 20 + [50.0, 55.0])
        self.assertEqual([p["step"] for p in peaks], [21, 22])

    def test_flat_series_has_no_peaks(self):
        self.assertEqual(detect_peaks([5.0] * 10), [])


class ForecastProgressTests(TestCase):
    """The engine's progress callback must reach the job record."""

    def _job(self):
        from apps.accounts.models import User
        from apps.datasets.models import Dataset
        from apps.processing.models import ProcessingJob

        user = User.objects.create_user(email="p@e.local", password="x")
        dataset = Dataset.objects.create(
            user=user, dataset_name="d.csv", original_filename="d.csv"
        )
        return ProcessingJob.objects.create(dataset=dataset, job_name="d.csv pipeline")

    def test_writer_persists_phase_and_counts(self):
        job = self._job()
        report = ForecastRunner._progress_writer(job)

        report("optimizing", 72, 144)
        job.refresh_from_db()

        self.assertEqual(job.progress_phase, "optimizing")
        self.assertEqual(job.progress_done, 72)
        self.assertEqual(job.progress_total, 144)

    def test_writer_throttles_on_elapsed_time(self):
        """Rapid consecutive steps collapse into a single write."""
        job = self._job()
        report = ForecastRunner._progress_writer(job)

        report("optimizing", 1, 1000)         # phase change -> writes
        report("optimizing", 2, 1000)         # within the interval -> suppressed
        report("optimizing", 9, 1000)         # within the interval -> suppressed
        job.refresh_from_db()
        self.assertEqual(job.progress_done, 1)

        time.sleep(ForecastRunner.PROGRESS_INTERVAL_S + 0.05)
        report("optimizing", 130, 1000)       # interval elapsed -> writes
        job.refresh_from_db()
        self.assertEqual(job.progress_done, 130)

    def test_final_step_always_written(self):
        job = self._job()
        report = ForecastRunner._progress_writer(job)

        report("optimizing", 143, 144)
        report("optimizing", 144, 144)        # last step must never be dropped
        job.refresh_from_db()
        self.assertEqual(job.progress_done, 144)

    def test_phase_change_always_written(self):
        job = self._job()
        report = ForecastRunner._progress_writer(job)

        report("differencing", 0, 0)
        job.refresh_from_db()
        self.assertEqual(job.progress_phase, "differencing")

        report("forecasting", 0, 0)
        job.refresh_from_db()
        self.assertEqual(job.progress_phase, "forecasting")


class RunStatusPayloadTests(TestCase):
    """The status endpoint must expose live counts and the selected order."""

    def test_status_reports_progress_and_selected_model(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.accounts.models import User
        from apps.datasets.models import Dataset
        from apps.processing.models import ProcessingJob, DatasetVersion, Stage
        from apps.forecasting.models import Forecast
        from apps.forecasting.views.run import RunStatusView

        user = User.objects.create_user(email="s@e.local", password="x")
        dataset = Dataset.objects.create(
            user=user, dataset_name="d.csv", original_filename="d.csv"
        )
        job = ProcessingJob.objects.create(
            dataset=dataset, job_name="d.csv pipeline",
            status=ProcessingJob.Status.RUNNING,
            progress_phase="optimizing", progress_done=72, progress_total=144,
        )
        version = DatasetVersion.objects.create(
            processing_job=job, dataset=dataset, version_number=1,
            stage=Stage.OUTLIERS, file_path="x.csv", record_count=1, checksum="c",
        )
        Forecast.objects.create(
            processing_job=job, dataset=dataset, stationary_dataset_version=version,
            p=1, d=1, q=1, seasonal_p=0, seasonal_d=0, seasonal_q=1,
            seasonal_period=7, aic=123.45, bic=130.0, forecast_horizon=30,
        )

        request = APIRequestFactory().get("/api/forecasting/status/", {"forecast_id": job.id})
        force_authenticate(request, user=user)
        data = RunStatusView.as_view()(request).data["data"]

        self.assertEqual(data["progress"]["step"], "optimizing")
        self.assertEqual(data["progress"]["done"], 72)
        self.assertEqual(data["progress"]["total"], 144)
        self.assertEqual(data["progress"]["percent"], 50)
        self.assertEqual(data["selected_model"]["order"], [1, 1, 1])
        self.assertEqual(data["selected_model"]["seasonal_order"], [0, 0, 1, 7])

    def test_percent_is_null_before_total_known(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.accounts.models import User
        from apps.datasets.models import Dataset
        from apps.processing.models import ProcessingJob
        from apps.forecasting.views.run import RunStatusView

        user = User.objects.create_user(email="s2@e.local", password="x")
        dataset = Dataset.objects.create(
            user=user, dataset_name="d.csv", original_filename="d.csv"
        )
        job = ProcessingJob.objects.create(dataset=dataset, job_name="p")

        request = APIRequestFactory().get("/api/forecasting/status/", {"forecast_id": job.id})
        force_authenticate(request, user=user)
        data = RunStatusView.as_view()(request).data["data"]

        self.assertIsNone(data["progress"]["percent"])
        self.assertIsNone(data["selected_model"])


class CandidateFeedTests(TestCase):
    """The candidate being fitted and the running leader must be persisted."""

    def _job(self):
        from apps.accounts.models import User
        from apps.datasets.models import Dataset
        from apps.processing.models import ProcessingJob

        user = User.objects.create_user(email="c@e.local", password="x")
        dataset = Dataset.objects.create(
            user=user, dataset_name="d.csv", original_filename="d.csv"
        )
        return ProcessingJob.objects.create(dataset=dataset, job_name="d.csv pipeline")

    def test_candidate_and_leader_are_recorded(self):
        job = self._job()
        report = ForecastRunner._progress_writer(job)

        report(
            "optimizing", 4, 8,
            {"order": [1, 1, 1], "seasonal_order": [1, 0, 0, 7], "aic": 534.25},
            {"order": [0, 1, 1], "seasonal_order": [1, 0, 0, 7], "aic": 530.54},
        )
        job.refresh_from_db()

        self.assertEqual(job.progress_candidate, "1,1,1,1,0,0,7")
        self.assertEqual(job.progress_best, "0,1,1,1,0,0,7")
        self.assertAlmostEqual(job.progress_best_aic, 530.54)

    def test_failed_candidate_still_reported(self):
        """A candidate that would not converge is still shown as attempted."""
        job = self._job()
        report = ForecastRunner._progress_writer(job)

        report("optimizing", 1, 8, {"order": [3, 1, 3], "seasonal_order": [2, 0, 2, 7],
                                    "error": "did not converge"}, None)
        job.refresh_from_db()

        self.assertEqual(job.progress_candidate, "3,1,3,2,0,2,7")
        self.assertEqual(job.progress_best, "")

    def test_status_expands_compact_orders(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from apps.forecasting.views.run import RunStatusView

        job = self._job()
        job.progress_phase = "optimizing"
        job.progress_done, job.progress_total = 4, 8
        job.progress_candidate = "1,1,1,1,0,0,7"
        job.progress_best = "0,1,1,1,0,0,7"
        job.progress_best_aic = 530.54
        job.save()

        request = APIRequestFactory().get("/api/forecasting/status/", {"forecast_id": job.id})
        force_authenticate(request, user=job.dataset.user)
        progress = RunStatusView.as_view()(request).data["data"]["progress"]

        self.assertEqual(progress["candidate"], {"order": [1, 1, 1], "seasonal_order": [1, 0, 0, 7]})
        self.assertEqual(progress["best"]["order"], [0, 1, 1])
        self.assertAlmostEqual(progress["best"]["aic"], 530.54)
