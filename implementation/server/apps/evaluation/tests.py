from django.test import TestCase

from algorithm.evaluation.AccuracyEvaluator import AccuracyEvaluator


class AccuracyEvaluatorTests(TestCase):

    def test_perfect_forecast(self):
        metrics = AccuracyEvaluator.evaluate([1.0, 2.0, 3.0], [1.0, 2.0, 3.0])
        self.assertEqual(metrics["mae"], 0.0)
        self.assertEqual(metrics["rmse"], 0.0)
        self.assertEqual(metrics["mape"], 0.0)

    def test_known_errors(self):
        metrics = AccuracyEvaluator.evaluate([10.0, 20.0], [12.0, 18.0])
        self.assertEqual(metrics["mae"], 2.0)
        self.assertEqual(metrics["rmse"], 2.0)
        self.assertAlmostEqual(metrics["mape"], 15.0)

    def test_zero_actuals_skipped_in_mape(self):
        metrics = AccuracyEvaluator.evaluate([0.0, 10.0], [1.0, 11.0])
        self.assertAlmostEqual(metrics["mape"], 10.0)

    def test_all_zero_actuals_gives_null_mape(self):
        metrics = AccuracyEvaluator.evaluate([0.0, 0.0], [1.0, 1.0])
        self.assertIsNone(metrics["mape"])

    def test_length_mismatch_rejected(self):
        with self.assertRaises(ValueError):
            AccuracyEvaluator.evaluate([1.0], [1.0, 2.0])

    def test_empty_rejected(self):
        with self.assertRaises(ValueError):
            AccuracyEvaluator.evaluate([], [])

    def test_acceptance_thresholds_pass(self):
        """Methodology 3.3.4: RMSE <= 15% of mean actual,
        MAPE <= 10%."""
        metrics = AccuracyEvaluator.evaluate(
            [100.0, 100.0], [101.0, 99.0]
        )
        self.assertAlmostEqual(metrics["rmse_pct_of_mean"], 1.0)
        self.assertTrue(metrics["meets_rmse_threshold"])
        self.assertTrue(metrics["meets_mape_threshold"])

    def test_acceptance_thresholds_fail(self):
        metrics = AccuracyEvaluator.evaluate(
            [100.0, 100.0], [150.0, 50.0]
        )
        self.assertFalse(metrics["meets_rmse_threshold"])
        self.assertFalse(metrics["meets_mape_threshold"])
