from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.models import User
from apps.accounts.permission.roles import IsAdmin
from apps.accounts.services.access_controller import AccessController
from apps.accounts.services.auth import serialize_user


class UserListView(APIView):
    """
    List all system users (admin only).
    Read-side companion to the AccessController operations.
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.all().order_by("id")

        return Response(
            {
                "success": True,
                "message": "Users retrieved.",
                "data": [
                    {**serialize_user(u), "is_active": u.is_active} for u in users
                ],
            },
            status=status.HTTP_200_OK,
        )


class UserCreateView(APIView):
    """
    Create a user account
    (per the design: AccessController.createUser()).
    """

    permission_classes = [IsAdmin]

    def post(self, request):

        try:
            user = AccessController.create_user(
                email=request.data.get("email"),
                password=request.data.get("password"),
                role=request.data.get("role"),
                first_name=request.data.get("first_name", ""),
                last_name=request.data.get("last_name", ""),
            )

        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc), "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "User created successfully.",
                "data": serialize_user(user),
            },
            status=status.HTTP_201_CREATED,
        )


class UserPermissionsView(APIView):
    """
    Update a user's role
    (per the design: AccessController.updatePermissions()).
    """

    permission_classes = [IsAdmin]

    def put(self, request):

        user_id = request.data.get("user_id")
        role = request.data.get("role")

        if not user_id or not role:
            return Response(
                {
                    "success": False,
                    "message": "user_id and role are required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = AccessController.update_permissions(user_id, role)

        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc), "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "Permissions updated successfully.",
                "data": serialize_user(user),
            },
            status=status.HTTP_200_OK,
        )


class UserRevokeView(APIView):
    """
    Revoke a user's access
    (per the design: AccessController.revokeAccess()).
    """

    permission_classes = [IsAdmin]

    def post(self, request):

        user_id = request.data.get("user_id")

        if not user_id:
            return Response(
                {
                    "success": False,
                    "message": "user_id is required.",
                    "data": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = AccessController.revoke_access(user_id)

        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc), "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "User access revoked.",
                "data": serialize_user(user),
            },
            status=status.HTTP_200_OK,
        )
