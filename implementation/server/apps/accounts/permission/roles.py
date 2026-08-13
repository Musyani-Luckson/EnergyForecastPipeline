from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class RolePermission(BasePermission):
    """
    Central RBAC system. The role lives directly on the user.
    """

    allowed_roles = []

    def has_permission(self, request, view):
        # Must be authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Django superuser is treated as ADMIN
        if request.user.is_superuser:
            role = User.Roles.ADMIN
        else:
            role = getattr(request.user, "role", None)

            if role is None:
                return False

        return role in self.allowed_roles


class IsAdmin(RolePermission):
    allowed_roles = [
        User.Roles.ADMIN,
    ]


class IsManager(RolePermission):
    allowed_roles = [
        User.Roles.ADMIN,
        User.Roles.MANAGER,
    ]


class IsUser(RolePermission):
    allowed_roles = [
        User.Roles.ADMIN,
        User.Roles.MANAGER,
        User.Roles.USER,
    ]
