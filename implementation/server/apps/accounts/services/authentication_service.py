from datetime import timedelta

from django.contrib.auth import authenticate

from rest_framework_simplejwt.tokens import RefreshToken


class AuthenticationService:
    """
    Control class for authentication (signIn / signOut /
    validateCredentials).

    Authentication is stateless JWT. There is no server-side
    session table; sign-out is handled by blacklisting the
    refresh token in the logout view.
    """

    # Refresh-cookie lifetime - mirrors REFRESH_TOKEN_LIFETIME
    # in SIMPLE_JWT. (Attribute name kept for the login view.)
    SESSION_TIMEOUT = timedelta(days=7)

    @classmethod
    def validate_credentials(cls, request, email: str, password: str):
        """
        Validate credentials against the user store.
        Returns the authenticated user or None.
        """
        if not email or not password:
            return None

        # USERNAME_FIELD is email; ModelBackend maps the
        # `username` kwarg onto it.
        return authenticate(request, username=email, password=password)

    @classmethod
    def sign_in(cls, request, email: str, password: str) -> dict | None:
        """
        Authenticate and issue tokens.

        Returns {user, access, refresh} on success,
        None on invalid credentials.
        """
        user = cls.validate_credentials(request, email, password)

        if user is None:
            return None

        refresh = RefreshToken.for_user(user)

        return {
            "user": user,
            "access": refresh.access_token,
            "refresh": refresh,
        }

    @classmethod
    def sign_out(cls, user) -> int:
        """
        Stateless sign-out. Token blacklisting is performed by
        the logout view against the refresh cookie; there is no
        server-side session state to clear here.
        """
        return 0
