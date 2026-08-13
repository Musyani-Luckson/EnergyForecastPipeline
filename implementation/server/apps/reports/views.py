from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services.report_generator import ReportGenerator


class GenerateView(APIView):
    """
    Generate a forecast report
    (per the design: ReportGenerator.generateReport()).
    """

    def post(self, request):

        result_id = request.data.get("result_id")

        if not result_id:
            return Response(
                {
                    "success": False,
                    "message": "result_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            report = ReportGenerator.generate_report(result_id)

        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc), "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "message": "Report generated.",
                "data": report,
            },
            status=status.HTTP_200_OK,
        )


class ExportView(APIView):
    """
    Export a forecast report to storage
    (per the design: exportReport()).
    """

    def get(self, request):

        result_id = request.query_params.get("result_id")
        export_format = request.query_params.get("format", "json")

        if not result_id:
            return Response(
                {
                    "success": False,
                    "message": "result_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if export_format not in ReportGenerator.SUPPORTED_FORMATS:
            return Response(
                {
                    "success": False,
                    "message": (
                        f"Unsupported format '{export_format}'. Supported: "
                        f"{sorted(ReportGenerator.SUPPORTED_FORMATS)}"
                    ),
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            export = ReportGenerator.export_report(
                result_id,
                export_format=export_format,
            )

        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc), "data": None},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Expose a downloadable URL (API spec 9.1: reportUrl).
        # export["report_path"] is stored relative to MEDIA_ROOT,
        # e.g. "reports/<ts>_forecast_<id>.pdf".
        report_url = request.build_absolute_uri(
            f"{settings.MEDIA_URL}{export['report_path']}"
        )

        return Response(
            {
                "success": True,
                "message": "Report exported.",
                "data": {
                    "report_url": report_url,
                    "report_path": export["report_path"],
                },
            },
            status=status.HTTP_200_OK,
        )
