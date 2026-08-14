import unittest

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

class DataIsolationTests(TestCase):
    """NFR6: a dataset owned by one user must not be readable by another."""

    @unittest.expectedFailure  # KNOWN DEFECT: read paths do not filter by owner (NFR6)
    def test_other_user_cannot_read_dataset_report(self):
        from apps.accounts.models import User
        from apps.datasets.models import Dataset
        from apps.datasets.views import DatasetPipelineView
        from apps.processing.models import ProcessingJob, DatasetVersion, Stage

        owner = User.objects.create_user(email="owner@e.local", password="x")
        other = User.objects.create_user(email="other@e.local", password="x")
        ds = Dataset.objects.create(user=owner, dataset_name="private.csv",
                                    original_filename="private.csv")
        job = ProcessingJob.objects.create(dataset=ds, job_name="private pipeline")
        DatasetVersion.objects.create(processing_job=job, dataset=ds, version_number=1,
                                      stage=Stage.RAW, file_path="p.csv",
                                      record_count=365, checksum="c")

        req = APIRequestFactory().get("/api/datasets/pipeline/")
        force_authenticate(req, user=other)
        runs = DatasetPipelineView.as_view()(req).data["data"]

        visible = [r for r in runs if r["run_id"] == str(job.id)]
        print(f"\n  [NFR6] runs visible to non-owner: {len(runs)}; "
              f"owner's run leaked: {bool(visible)}")
        self.assertEqual(visible, [], "non-owner could see another user's dataset")
