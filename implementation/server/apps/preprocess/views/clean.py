from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from datetime import datetime, timezone

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from apps.datasets.models import Dataset

from utils.data_loader import load_dataset

from algorithm.preprocess.dataClearning.clean_duplicates import clean_duplicates
from algorithm.preprocess.dataClearning.enforce_daily_continuity import (
    enforce_daily_continuity,
)
from algorithm.preprocess.dataClearning.fill_missing_values import (
    fill_missing_values,
)


class CleanDatasetView(APIView):
    """
    Stage 1: CLEANING PIPELINE NODE CREATION

    Each execution produces:
    - new Dataset row
    - linked dependency to previous dataset node
    - same run_id propagation
    """

    DEPENDENCIES = {
        "enforce_daily_continuity": ["fill_missing_values"],
    }

    SUPPORTED_ACTIONS = {
        "remove_duplicates",
        "enforce_daily_continuity",
        "fill_missing_values",
    }

    def post(self, request):

        dataset_id = request.data.get("dataset_id")
        cleaning = request.data.get("cleaning", {})

        if not dataset_id:
            return Response(
                {"success": False, "message": "dataset_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(cleaning, dict):
            return Response(
                {"success": False, "message": "cleaning must be an object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -----------------------------
        # Load source node
        # -----------------------------
        source = Dataset.objects.get(id=dataset_id)
        df = load_dataset(source.file_path)["dataframe"]

        # -----------------------------
        # Resolve actions
        # -----------------------------
        resolved = {a: False for a in self.SUPPORTED_ACTIONS}

        for action, enabled in cleaning.items():
            if action not in self.SUPPORTED_ACTIONS:
                return Response(
                    {"success": False, "message": f"Unsupported action {action}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            resolved[action] = bool(enabled)

        dependency_notes = []

        for action, enabled in resolved.items():
            if enabled:
                for dep in self.DEPENDENCIES.get(action, []):
                    if not resolved[dep]:
                        resolved[dep] = True
                        dependency_notes.append(f"{dep} auto-enabled due to {action}")

        # -----------------------------
        # Apply pipeline
        # -----------------------------
        applied = []

        if resolved["remove_duplicates"]:
            df = clean_duplicates(df)
            applied.append("remove_duplicates")

        if resolved["enforce_daily_continuity"]:
            df = enforce_daily_continuity(df)
            applied.append("enforce_daily_continuity")

        if resolved["fill_missing_values"]:
            df = fill_missing_values(df)
            applied.append("fill_missing_values")

        # -----------------------------
        # Save new dataset file
        # -----------------------------
        timestamp = (
            datetime.now(timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
            .replace(":", "-")
        )

        output_path = f"datasets/cleaned/{timestamp}_{source.name}"

        csv_buffer = df.to_csv(index=False).encode("utf-8")

        stored_path = default_storage.save(
            output_path,
            ContentFile(csv_buffer),
        )

        # -----------------------------
        # Create NEW dataset node (NO MUTATION)
        # -----------------------------
        cleaned_node = Dataset.objects.create(
            run_id=source.run_id,  # propagate pipeline group
            name=source.name,
            file_path=stored_path,
            file_size=len(csv_buffer),
            stage="CLEANED",
            dependency=source,
            instructions=resolved,
            metadata={
                "applied_steps": applied,
                "dependency_notes": dependency_notes,
                "rows": len(df),
                "columns": list(df.columns),
            },
        )

        # -----------------------------
        # RESPONSE
        # -----------------------------
        return Response(
            {
                "success": True,
                "message": "Cleaning stage completed.",
                "data": {
                    "source_id": source.id,
                    "cleaned_id": cleaned_node.id,
                    "run_id": str(source.run_id),
                    "stage": cleaned_node.stage,
                    "file_path": stored_path,
                    "applied_steps": applied,
                },
            },
            status=status.HTTP_200_OK,
        )
