from django.urls import path
from .views import UploadView, ListView, DetailView

urlpatterns = [
    path("upload/", UploadView.as_view()),
    path("list/", ListView.as_view()),
    path("detail/", DetailView.as_view()),
]
