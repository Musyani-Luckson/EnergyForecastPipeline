from django.urls import path
from .views import RunView, MetricsView

urlpatterns = [
    path("run/", RunView.as_view()),
    path("metrics/", MetricsView.as_view()),
]
