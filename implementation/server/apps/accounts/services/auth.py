from apps.accounts.models import User


def get_user_role(user):
    if user.is_superuser:
        return User.Roles.ADMIN

    return getattr(user, "role", None)


def serialize_user(user):
    return {
        "id": user.id,
        "username": user.email,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": get_user_role(user),
        "is_superuser": user.is_superuser,
        "is_staff": user.is_staff,
    }


def build_auth_response(user, access=None, refresh=None, message="Success"):
    response = {
        "success": True,
        "message": message,
        "user": serialize_user(user),
    }

    if access and refresh:
        response["tokens"] = {
            "access": str(access),
            # "refresh": str(refresh),
        }

    return response
