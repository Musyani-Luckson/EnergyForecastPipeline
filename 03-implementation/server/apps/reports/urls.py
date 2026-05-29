from django.urls import path
from .views import GenerateView, ExportView

urlpatterns = [
    path("generate/", GenerateView.as_view()),
    path("export/", ExportView.as_view()),
]

