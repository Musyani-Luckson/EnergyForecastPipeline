import time

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.processing.models import DatasetVersion, PreprocessingLog, Stage
from apps.processing.services import load_version_df, next_version, VALUE_COLUMN

from algorithm.preprocess.dataClearning.clean_duplicates import clean_duplicates
from algorithm.preprocess.dataClearning.enforce_daily_continuity import (
    enforce_daily_continuity,
)
from algorithm.preprocess.dataClearning.fill_missing_values import fill_missing_values


class CleanDatasetView(APIView):
    """
    Stage: CLEANED. Applies the requested cleaning steps to a source
    DatasetVersion, writes a new CLEANED DatasetVersion, and records a
    PreprocessingLog with the cleaning statistics.
    """

    DEPENDENCIES = {"enforce_daily_continuity": ["fill_missing_values"]}
    SUPPORTED_ACTIONS = {
        "remove_duplicates",
        "enforce_daily_continuity",
        "fill_missing_values",
    }

    def post(self, request):
        version_id = request.data.get("dataset_id")
        cleaning = request.data.get("cleaning", {})

        if not version_id:
            return Response(
                {"success": False, "message": "dataset_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(cleaning, dict):
            return Response(
                {"success": False, "message": "cleaning must be an object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            source = DatasetVersion.objects.get(id=version_id)
        except DatasetVersion.DoesNotExist:
            return Response(
                {"success": False, "message": f"Dataset version {version_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Resolve requested actions + dependency auto-enable.
        resolved = {a: False for a in self.SUPPORTED_ACTIONS}
        for action, enabled in cleaning.items():
            if action not in self.SUPPORTED_ACTIONS:
                return Response(
                    {"success": False, "message": f"Unsupported action {action}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            resolved[action] = bool(enabled)

        dependency_notes = []
        for action, enabled in list(resolved.items()):
            if enabled:
                for dep in self.DEPENDENCIES.get(action, []):
                    if not resolved[dep]:
                        resolved[dep] = True
                        dependency_notes.append(f"{dep} auto-enabled due to {action}")

        started = time.perf_counter()
        df = load_version_df(source)

        # ── apply pipeline, tracking stats ──
        applied = []
        duplicate_rows_removed = 0
        missing_values_fixed = 0

        if resolved["remove_duplicates"]:
            before = len(df)
            df = clean_duplicates(df)
            duplicate_rows_removed = max(0, before - len(df))
            applied.append("remove_duplicates")

        if resolved["enforce_daily_continuity"]:
            df = enforce_daily_continuity(df)
            applied.append("enforce_daily_continuity")

        if resolved["fill_missing_values"]:
            missing_before = (
                int(df[VALUE_COLUMN].isna().sum()) if VALUE_COLUMN in df.columns else 0
            )
            df = fill_missing_values(df)
            missing_after = (
                int(df[VALUE_COLUMN].isna().sum()) if VALUE_COLUMN in df.columns else 0
            )
            missing_values_fixed = max(0, missing_before - missing_after)
            applied.append("fill_missing_values")

        elapsed_ms = int((time.perf_counter() - started) * 1000)

        cleaned_version = next_version(source, Stage.CLEANED, df, "cleaned")

        PreprocessingLog.objects.create(
            processing_job=cleaned_version.processing_job,
            dataset_version=cleaned_version,
            stage=Stage.CLEANED,
            status=PreprocessingLog.Status.SUCCESS,
            processing_time_ms=elapsed_ms,
            missing_values_fixed=missing_values_fixed,
            duplicate_rows_removed=duplicate_rows_removed,
            notes="; ".join(dependency_notes),
        )

        return Response(
            {
                "success": True,
                "message": "Cleaning stage completed.",
                "data": {
                    "source_id": source.id,
                    "cleaned_id": cleaned_version.id,
                    "run_id": str(cleaned_version.processing_job_id),
                    "stage": "CLEANED",
                    "file_path": cleaned_version.file_path,
                    "applied_steps": applied,
                    "duplicate_rows_removed": duplicate_rows_removed,
                    "missing_values_fixed": missing_values_fixed,
                },
            },
            status=status.HTTP_200_OK,
        )
