from rest_framework.permissions import BasePermission


class RolePermission(BasePermission):
    """
    Central role-based access control system.
    Reusable across all views.
    """

    allowed_roles = []

    def has_permission(self, request, view):

        if not request.user or not request.user.is_authenticated:
            return False

        account = getattr(request.user, "account", None)

        if not account:
            return False

        return account.role in self.allowed_roles


class IsAdmin(RolePermission):
    allowed_roles = ["admin"]


class IsManager(RolePermission):
    allowed_roles = ["manager", "admin"]


class IsUser(RolePermission):
    allowed_roles = ["user", "manager", "admin"]
