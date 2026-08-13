from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction

from apps.accounts.models import User


class AccessController:
    """
    Control class for user access management (per the system
    class diagram: createUser(), updatePermissions(),
    revokeAccess()).

    All operations are admin-only; enforcement lives in the
    view layer via the IsAdmin permission class.
    """

    @staticmethod
    def _validate_role(role: str) -> str:
        valid = {choice.value for choice in User.Roles}

        if role not in valid:
            raise ValueError(f"Invalid role '{role}'. Valid roles: {sorted(valid)}")

        return role

    @classmethod
    @transaction.atomic
    def create_user(
        cls,
        email: str,
        password: str,
        role: str,
        first_name: str = "",
        last_name: str = "",
    ) -> User:
        """
        Create a user account with a role
        (per the class diagram: createUser()).
        """
        if not email:
            raise ValueError("email is required.")

        try:
            validate_email(email)
        except ValidationError:
            raise ValueError(f"'{email}' is not a valid email address.")

        if not password or len(password) < 8:
            raise ValueError("password must be at least 8 characters.")

        cls._validate_role(role)

        if User.objects.filter(email=email).exists():
            raise ValueError(f"A user with email '{email}' already exists.")

        return User.objects.create_user(
            email=email,
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
        )

    @classmethod
    def update_permissions(cls, user_id: int, role: str) -> User:
        """
        Change a user's role
        (per the class diagram: updatePermissions()).
        """
        cls._validate_role(role)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise ValueError(f"User {user_id} does not exist.")

        user.role = role
        user.save(update_fields=["role", "updated_at"])

        return user

    @classmethod
    def revoke_access(cls, user_id: int) -> User:
        """
        Revoke a user's access by deactivating the account
        (per the class diagram: revokeAccess()).

        Deactivation, not deletion — the user's history stays
        intact for auditability.
        """
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise ValueError(f"User {user_id} does not exist.")

        if user.is_superuser:
            raise ValueError("Cannot revoke access for a superuser.")

        user.is_active = False
        user.save(update_fields=["is_active", "updated_at"])

        return user
