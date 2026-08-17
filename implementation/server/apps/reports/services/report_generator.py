import io
import json
from datetime import datetime, timezone

import matplotlib

matplotlib.use("Agg")  # headless rendering inside the server process

from matplotlib import pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from apps.forecasting.models import Forecast
from apps.forecasting.serializers import build_forecast_dto
from apps.reports.models import Report


class ReportGenerator:
    """
    Report generation (ReportGenerator.generateReport()).

    Composes a forecast report entirely from the normalized tables
    (Forecast + ForecastValue + EvaluationMetric + the pipeline's
    DatasetVersion lineage) - nothing is read from stored JSON.
    """

    SUPPORTED_FORMATS = {"json", "pdf", "csv"}

    @staticmethod
    def _lineage(forecast) -> list:
        """Pipeline lineage = the run's DatasetVersions, RAW→FORECAST."""
        versions = sorted(
            forecast.processing_job.versions.all(),
            key=lambda v: v.version_number,
        )
        return [
            {
                "dataset_id": v.id,
                "name": forecast.dataset.dataset_name,
                "stage": v.stage.upper(),
                "created_at": v.created_at.isoformat(),
            }
            for v in versions
        ]

    @classmethod
    def generate_report(cls, result_id: int) -> dict:
        """Build the report payload for a Forecast (result_id = Forecast id)."""
        try:
            forecast = (
                Forecast.objects.select_related("dataset", "processing_job", "evaluation")
                .prefetch_related("values", "processing_job__versions")
                .get(pk=result_id)
            )
        except Forecast.DoesNotExist:
            raise ValueError(f"Forecast result {result_id} does not exist.")

        dto = build_forecast_dto(forecast)

        return {
            "report_type": "forecast",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "result_id": forecast.id,
            "run_id": str(forecast.processing_job_id),
            "model": {
                "algorithm": "SARIMA",
                "order": dto["order"],
                "seasonal_order": dto["seasonal_order"],
            },
            "configuration": {
                "algorithm": "SARIMA",
                "forecast_horizon": forecast.forecast_horizon,
                "seasonal_period": forecast.seasonal_period,
                "aic": forecast.aic,
                "bic": forecast.bic,
            },
            "metrics": dto["metrics"],
            "forecast": {
                "values": dto["values"],
                "lower_bound": dto["lower_bound"],
                "upper_bound": dto["upper_bound"],
            },
            "peaks": dto["peaks"],
            "pipeline_lineage": cls._lineage(forecast),
        }

    @classmethod
    def export_report(cls, result_id: int, export_format: str = "json") -> dict:
        """Render a report, persist the file, and record a Report row."""
        if export_format not in cls.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported format '{export_format}'. "
                f"Supported: {sorted(cls.SUPPORTED_FORMATS)}"
            )

        report = cls.generate_report(result_id)
        forecast = Forecast.objects.select_related("processing_job").get(pk=result_id)

        timestamp = (
            datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
            .replace(":", "-")
        )

        if export_format == "pdf":
            payload = cls._render_pdf(report)
        elif export_format == "csv":
            payload = cls._render_csv(report)
        else:
            payload = json.dumps(report, indent=2, default=str).encode("utf-8")

        stored_path = default_storage.save(
            f"reports/{timestamp}_forecast_{result_id}.{export_format}",
            ContentFile(payload),
        )

        Report.objects.create(
            processing_job=forecast.processing_job,
            forecast=forecast,
            report_type=export_format,
            file_path=stored_path,
        )

        return {"report_path": stored_path, "report": report}

    # -----------------------------
    # CSV rendering
    # -----------------------------

    @staticmethod
    def _render_csv(report: dict) -> bytes:
        model = report["model"]
        metrics = report["metrics"] or {}
        forecast = report["forecast"]
        peak_steps = {p["step"] for p in report.get("peaks", [])}

        lines = [
            "# Energy Forecast Report",
            f"# generated_at,{report['generated_at']}",
            f"# result_id,{report['result_id']}",
            f"# run_id,{report['run_id']}",
            f"# algorithm,{model['algorithm']}",
            f"# order,\"{tuple(model['order'])}\"",
            f"# seasonal_order,\"{tuple(model['seasonal_order'])}\"",
        ]
        for key in ("rmse", "mae", "mape", "rmse_pct_of_mean"):
            if metrics.get(key) is not None:
                lines.append(f"# {key},{metrics[key]}")

        lines.append("step,forecast,lower_bound,upper_bound,is_peak")
        for i, (value, low, high) in enumerate(
            zip(forecast["values"], forecast["lower_bound"], forecast["upper_bound"]),
            start=1,
        ):
            lines.append(f"{i},{value},{low},{high},{1 if i in peak_steps else 0}")

        return "\n".join(lines).encode("utf-8")

    # -----------------------------
    # PDF rendering
    # -----------------------------

    @classmethod
    def _render_pdf(cls, report: dict) -> bytes:
        buffer = io.BytesIO()
        with PdfPages(buffer) as pdf:
            cls._render_summary_page(pdf, report)
            cls._render_chart_page(pdf, report)
        return buffer.getvalue()

    @staticmethod
    def _render_summary_page(pdf, report: dict) -> None:
        fig = plt.figure(figsize=(8.27, 11.69))
        fig.suptitle("Energy Forecast Report", fontsize=16, y=0.96)

        model = report["model"]
        metrics = report["metrics"] or {}

        lines = [
            f"Generated: {report['generated_at']}",
            f"Result ID: {report['result_id']}",
            f"Run ID: {report['run_id']}",
            "",
            "Model",
            f"  Algorithm: {model['algorithm']}",
            f"  Order (p, d, q): {tuple(model['order'])}",
            f"  Seasonal order (P, D, Q, s): {tuple(model['seasonal_order'])}",
            "",
            "Configuration",
        ]
        for key, value in report["configuration"].items():
            lines.append(f"  {key}: {value}")

        lines += ["", "Accuracy metrics"]
        if metrics:
            for key in ("n_observations", "mae", "rmse", "mape"):
                if key in metrics and metrics[key] is not None:
                    value = metrics[key]
                    formatted = f"{value:.4f}" if isinstance(value, float) else value
                    lines.append(f"  {key.upper()}: {formatted}")
        else:
            lines.append("  (not evaluated)")

        lines += ["", "Pipeline lineage"]
        for step in report["pipeline_lineage"]:
            lines.append(f"  {step['stage']}: {step['name']} (version {step['dataset_id']})")

        fig.text(0.08, 0.90, "\n".join(lines), fontsize=9, family="monospace", va="top")
        pdf.savefig(fig)
        plt.close(fig)

    @staticmethod
    def _render_chart_page(pdf, report: dict) -> None:
        forecast = report["forecast"]
        steps = list(range(1, len(forecast["values"]) + 1))

        fig, ax = plt.subplots(figsize=(11.69, 8.27))
        ax.plot(steps, forecast["values"], label="Forecast", linewidth=1.5)
        ax.fill_between(
            steps, forecast["lower_bound"], forecast["upper_bound"],
            alpha=0.2, label="Confidence interval",
        )
        peaks = report.get("peaks", [])
        if peaks:
            ax.scatter(
                [p["step"] for p in peaks], [p["value"] for p in peaks],
                marker="^", s=60, zorder=3, label="Peak demand",
            )
        ax.set_title("Forecast horizon")
        ax.set_xlabel("Step")
        ax.set_ylabel("Daily_kWh")
        ax.legend()
        ax.grid(True, alpha=0.3)
        pdf.savefig(fig)
        plt.close(fig)
