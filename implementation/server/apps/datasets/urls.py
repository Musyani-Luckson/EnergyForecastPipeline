from django.urls import path
from .views import UploadView, DatasetReportView, DatasetPipelineView, DatasetSeriesView

urlpatterns = [
    path("upload/", UploadView.as_view()),
    path("report/", DatasetReportView.as_view()),
    path("pipeline/", DatasetPipelineView.as_view()),
    path("series/", DatasetSeriesView.as_view()),
]
