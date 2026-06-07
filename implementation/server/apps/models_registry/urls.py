from django.urls import path
from .views import RegisterView, ListView, DetailView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("list/", ListView.as_view()),
    path("detail/", DetailView.as_view()),
]
