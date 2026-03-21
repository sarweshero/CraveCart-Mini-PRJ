"""Custom token authentication for DRF."""
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import AuthToken


class CraveCartTokenAuthentication(BaseAuthentication):
    """
    Authenticate against our custom AuthToken model.
    Header: Authorization: Token <access_token>
    """
    keyword = "Token"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None  # Let other authenticators try

        raw_token = auth_header.split(" ", 1)[1].strip()
        if not raw_token:
            return None

        return self._authenticate_token(raw_token)

    def _authenticate_token(self, raw_token):
        try:
            token = (
                AuthToken.objects
                .select_related("user")
                .get(access_token=raw_token)
            )
        except AuthToken.DoesNotExist:
            raise AuthenticationFailed("Invalid or expired token.")

        if token.is_revoked:
            raise AuthenticationFailed("Token has been revoked.")

        if not token.is_access_valid:
            raise AuthenticationFailed("Token has expired. Please refresh.")

        if not token.user.is_active:
            raise AuthenticationFailed("Account is inactive.")

        # Bump last_used_at lazily (don't block the request)
        AuthToken.objects.filter(pk=token.pk).update(last_used_at=timezone.now())

        return (token.user, token)

    def authenticate_header(self, request):
        return self.keyword
