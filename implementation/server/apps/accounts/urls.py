from django.urls import path

from .views.register import RegisterView
from .views.login import LoginView
from .views.refresh import RefreshView
from .views.logout import LogoutView
from .views.me import MeView
from .views.users import (
    UserListView,
    UserCreateView,
    UserPermissionsView,
    UserRevokeView,
)

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", LoginView.as_view()),
    path("refresh/", RefreshView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", MeView.as_view()),
    # AccessController (user management)
    path("users/list/", UserListView.as_view()),
    path("users/create/", UserCreateView.as_view()),
    path("users/permissions/", UserPermissionsView.as_view()),
    path("users/revoke/", UserRevokeView.as_view()),
]
