from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.services.auth import build_auth_response
from apps.accounts.services.authentication_service import AuthenticationService


class LoginView(APIView):
    """
    Sign in (per the design: AuthenticationService.signIn()).

    Thin controller: credential validation and session
    creation live in AuthenticationService.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):

        email = request.data.get("email")
        password = request.data.get("password")

        result = AuthenticationService.sign_in(request, email, password)

        if result is None:
            return Response(
                {"message": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response(
            build_auth_response(
                user=result["user"],
                access=result["access"],
                refresh=result["refresh"],
                message="Login successful",
            ),
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key="refresh_token",
            value=str(result["refresh"]),
            httponly=True,
            secure=False,  # dev only
            # samesite="Lax",
            max_age=int(AuthenticationService.SESSION_TIMEOUT.total_seconds()),
        )

        return response
