from django.urls import path

from .views.clean import CleanDatasetView
from .views.outliers import OutlierDetectionView
from .views.stationarity import StationarityView

urlpatterns = [
    path("clean/", CleanDatasetView.as_view()),
    path("outliers/", OutlierDetectionView.as_view()),
    path("stationarity/", StationarityView.as_view()),
]
