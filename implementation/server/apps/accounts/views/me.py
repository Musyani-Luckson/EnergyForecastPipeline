from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.accounts.services.auth import build_auth_response


class MeView(APIView):
    """
    Returns the currently authenticated user.
    Used for UI hydration and session validation.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user = request.user

        if not user or not user.is_authenticated:
            return Response(
                {"is_authenticated": False},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(
            build_auth_response(
                user=user,
                access=None,  # no token issued here
                refresh=None,  # no token issued here
                message="User session active",
            ),
            status=status.HTTP_200_OK,
        )
