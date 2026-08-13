import numpy as np
import pandas as pd

from django.test import TestCase

from algorithm.forecastEngine.stationarity.StationarityEngine import StationarityEngine
from algorithm.forecastEngine.differencing.DifferencingEngine import DifferencingEngine
from algorithm.forecastEngine.SARIMA.SARIMAEngine import SARIMAEngine
from algorithm.forecastEngine.ForecastEngine import ForecastEngine

from apps.forecasting.services.forecast_runner import detect_peaks


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
