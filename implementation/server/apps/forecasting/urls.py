from django.urls import path

from .views.stationarity import StationarityView
from .views.differencing import DifferencingView
from .views.save import SaveView
from .views.run import (
    RunForecastView,
    RunStatusView,
    ResultListView,
    ForecastSeriesView,
)

urlpatterns = [
    path("stationarity/", StationarityView.as_view()),
    path("differencing/", DifferencingView.as_view()),
    path("save/", SaveView.as_view()),
    path("run/", RunForecastView.as_view()),
    path("status/", RunStatusView.as_view()),
    path("results/", ResultListView.as_view()),
    path("series/", ForecastSeriesView.as_view()),
]
