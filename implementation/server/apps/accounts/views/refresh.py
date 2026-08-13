from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication, BasicAuthentication


from apps.accounts.services.auth import build_auth_response

User = get_user_model()


class RefreshView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []  # CRITICAL FIX

    def post(self, request):

        refresh_token = request.COOKIES.get("refresh_token")
        print("TOKEN", request.COOKIES)
        if not refresh_token:
            return Response(
                {"message": "Refresh token missing"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_refresh = RefreshToken(refresh_token)

            user_id = old_refresh.payload.get("user_id")
            user = User.objects.get(id=user_id)

            new_refresh = RefreshToken.for_user(user)
            new_access = new_refresh.access_token

            response = Response(
                build_auth_response(
                    user=user,
                    access=new_access,
                    refresh=new_refresh,
                    message="Token refreshed",
                ),
                status=status.HTTP_200_OK,
            )

            response.set_cookie(
                key="refresh_token",
                value=str(new_refresh),
                httponly=True,
                secure=False,
                # samesite="Lax",
                max_age=60 * 60 * 24 * 7,
            )

            return response

        except (TokenError, User.DoesNotExist):
            return Response(
                {"message": "Invalid refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
