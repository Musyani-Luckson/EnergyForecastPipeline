from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.accounts.services.authentication_service import AuthenticationService


class LogoutView(APIView):
    """
    Sign out (per the design: AuthenticationService.signOut()).

    Ends the user's active Session rows and blacklists the
    refresh token.
    """

    def post(self, request):

        AuthenticationService.sign_out(request.user)

        refresh_token = request.COOKIES.get("refresh_token")

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)

                # optional: verify token is still valid before blacklisting
                token.blacklist()

            except TokenError:
                return Response(
                    {"message": "Invalid or expired token"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        response = Response(
            {"message": "Logged out"},
            status=status.HTTP_200_OK,
        )

        response.delete_cookie(
            "refresh_token",
            path="/",
            samesite="Lax",
        )

        return response
