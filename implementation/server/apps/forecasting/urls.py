from django.urls import path
from .views import PredictView, BatchPredictView

urlpatterns = [
    path("predict/", PredictView.as_view()),
    path("batch_predict/", BatchPredictView.as_view()),
]
