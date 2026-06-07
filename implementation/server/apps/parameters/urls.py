from django.urls import path
from .views import CreateView, ListView, UpdateView

urlpatterns = [
    path("create/", CreateView.as_view()),
    path("list/", ListView.as_view()),
    path("update/", UpdateView.as_view()),
]
