from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.test import TestCase

from apps.datasets.models import Dataset
from apps.processing.models import ProcessingJob, DatasetVersion, Stage
from apps.forecasting.models import Forecast, ForecastValue
from apps.evaluation.models import EvaluationMetric
from apps.reports.models import Report
from apps.reports.services.report_generator import ReportGenerator

User = get_user_model()


class ReportGeneratorTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(email="r@test.com", password="password123")
        self.dataset = Dataset.objects.create(
            user=user, dataset_name="b.csv", original_filename="b.csv"
        )
        self.job = ProcessingJob.objects.create(dataset=self.dataset, job_name="run")
        self.raw = DatasetVersion.objects.create(
            processing_job=self.job, dataset=self.dataset, version_number=1,
            stage=Stage.RAW, file_path="datasets/raw/b.csv", checksum="x",
        )
        self.forecast = Forecast.objects.create(
            processing_job=self.job, dataset=self.dataset,
            stationary_dataset_version=self.raw,
            p=1, d=1, q=0, seasonal_p=1, seasonal_d=0, seasonal_q=0, seasonal_period=7,
            aic=193.0, bic=203.0, forecast_horizon=3,
        )
        for i in range(3):
            ForecastValue.objects.create(
                forecast=self.forecast, forecast_date=date(2024, 1, i + 1),
                predicted_value=Decimal("10.0"), lower_confidence=Decimal("9.0"),
                upper_confidence=Decimal("11.0"),
            )
        EvaluationMetric.objects.create(
            forecast=self.forecast, rmse=Decimal("0.5"), mae=Decimal("0.4"),
            mape=Decimal("4.2"),
        )
        self.exported = []

    def tearDown(self):
        for p in self.exported:
            default_storage.delete(p)

    def test_generate_report(self):
        report = ReportGenerator.generate_report(self.forecast.id)
        self.assertEqual(report["result_id"], self.forecast.id)
        self.assertEqual(report["model"]["order"], [1, 1, 0])
        self.assertEqual([s["stage"] for s in report["pipeline_lineage"]], ["RAW"])

    def test_generate_missing_rejected(self):
        with self.assertRaises(ValueError):
            ReportGenerator.generate_report(999999)

    def test_export_pdf_and_records_report_row(self):
        export = ReportGenerator.export_report(self.forecast.id, "pdf")
        self.exported.append(export["report_path"])
        self.assertTrue(export["report_path"].endswith(".pdf"))
        self.assertTrue(Report.objects.filter(forecast=self.forecast, report_type="pdf").exists())

    def test_export_csv(self):
        export = ReportGenerator.export_report(self.forecast.id, "csv")
        self.exported.append(export["report_path"])
        with default_storage.open(export["report_path"], "rb") as fh:
            content = fh.read().decode()
        self.assertIn("step,forecast,lower_bound,upper_bound,is_peak", content)

    def test_unsupported_format_rejected(self):
        with self.assertRaises(ValueError):
            ReportGenerator.export_report(self.forecast.id, "docx")
