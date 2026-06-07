from django.urls import path
from .views import (
    UploadView,
    DatasetReportView,
)

urlpatterns = [
    path("upload/", UploadView.as_view()),
    path("report/", DatasetReportView.as_view()),
]
