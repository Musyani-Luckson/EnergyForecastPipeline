import re

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.models import User
from apps.accounts.permission.roles import IsAdmin

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"


class RegisterView(APIView):

    permission_classes = [IsAdmin]  # ONLY THIS ONE

    def post(self, request):

        email = request.data.get("email")
        password = request.data.get("password")
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()
        role = request.data.get("role")

        # -------------------------
        # Validation: required fields
        # -------------------------
        if not email:
            return Response(
                {"message": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not password:
            return Response(
                {"message": "Password is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------
        # Validation: email format
        # -------------------------
        if not re.match(EMAIL_REGEX, email):
            return Response(
                {"message": "Invalid email format"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------
        # Validation: password strength
        # -------------------------
        if len(password) < 8:
            return Response(
                {"message": "Password must be at least 8 characters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"message": "User already exists"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------
        # Validation: role safety
        # -------------------------
        allowed_roles = {choice.value for choice in User.Roles}

        if role not in allowed_roles:
            return Response(
                {
                    "message": "Invalid role",
                    "allowed_roles": sorted(allowed_roles),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # -------------------------
        # Create user (password is hashed automatically)
        # -------------------------
        user = User.objects.create_user(
            email=email,
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
        )

        return Response(
            {
                "message": "User registered successfully",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_201_CREATED,
        )
