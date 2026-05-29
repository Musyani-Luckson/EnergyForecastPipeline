from django.urls import path
from .views import HealthView, StatusView

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("status/", StatusView.as_view()),
]
