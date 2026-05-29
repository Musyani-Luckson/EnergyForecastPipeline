from django.urls import path
from .views import OverviewView, AnalyticsView

urlpatterns = [
    path("overview/", OverviewView.as_view()),
    path("analytics/", AnalyticsView.as_view()),
]
