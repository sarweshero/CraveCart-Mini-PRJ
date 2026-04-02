"""apps/accounts/views.py — All authentication endpoints."""

from urllib.parse import urlencode

from django.conf import settings
from django.core.files.storage import default_storage
from django.shortcuts import redirect as django_redirect
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import AuthToken, Address
from .serializers import (
    RegisterSerializer, LoginSerializer, TokenRefreshSerializer,
    CompleteProfileSerializer, ProfileUpdateSerializer,
    DeleteAccountSerializer, UserPublicSerializer, AddressSerializer,
    AuthTokenSerializer,
)
from utils.media import build_upload_path, delete_storage_file_if_managed, sanitize_folder

User = get_user_model()


class LoginThrottle(AnonRateThrottle):
    rate = "10/min"
    scope = "login"


# ── Register ──────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    """POST /api/auth/register/ — Create new customer or hotel_admin account."""
    permission_classes = [AllowAny]
    throttle_classes   = [AnonRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token = AuthToken.create_for_user(user, request)

        return Response({
            "message": "Registration successful. Please complete your profile.",
            "user":    UserPublicSerializer(user).data,
            "token":   token.access_token,
            "refresh_token": token.refresh_token,
            "expires_in":    AuthTokenSerializer(token).data["expires_in"],
        }, status=status.HTTP_201_CREATED)


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    """POST /api/auth/login/ — Authenticate and return token pair."""
    permission_classes = [AllowAny]
    throttle_classes   = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        # Revoke all previous tokens for security
        AuthToken.objects.filter(user=user, is_revoked=False).update(is_revoked=True)

        token = AuthToken.create_for_user(user, request)

        return Response({
            "token":         token.access_token,
            "refresh_token": token.refresh_token,
            "expires_in":    AuthTokenSerializer(token).data["expires_in"],
            "user":          UserPublicSerializer(user).data,
        })


# ── Token Refresh ─────────────────────────────────────────────────────────────

class TokenRefreshView(APIView):
    """POST /api/auth/token/refresh/ — Get new access token via refresh token."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_token = serializer.instance
        user      = old_token.user

        # Revoke old token pair, issue new one
        old_token.revoke()
        new_token = AuthToken.create_for_user(user, request)

        return Response({
            "token":         new_token.access_token,
            "refresh_token": new_token.refresh_token,
            "expires_in":    AuthTokenSerializer(new_token).data["expires_in"],
        })


# ── Logout ────────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    """POST /api/auth/logout/ — Revoke current token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.auth  # Set by CraveCartTokenAuthentication
        if isinstance(token, AuthToken):
            token.revoke()
        return Response({"message": "Logged out successfully."})


# ── Me ────────────────────────────────────────────────────────────────────────

class MeView(APIView):
    """GET /api/auth/me/ · PATCH /api/auth/me/ — Current user profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserPublicSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserPublicSerializer(request.user).data)


# ── Complete Profile ──────────────────────────────────────────────────────────

class CompleteProfileView(APIView):
    """POST /api/auth/complete-profile/ — Required post-registration step."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.is_profile_complete:
            return Response({"message": "Profile is already complete."})

        serializer = CompleteProfileSerializer(
            request.user, data=request.data
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            "message": "Profile completed successfully.",
            "user":    UserPublicSerializer(user).data,
        })


# ── Addresses ─────────────────────────────────────────────────────────────────

class AddressListCreateView(APIView):
    """GET / POST /api/auth/addresses/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        addresses = request.user.addresses.all()
        return Response(AddressSerializer(addresses, many=True).data)

    def post(self, request):
        serializer = AddressSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AddressDetailView(APIView):
    """PATCH / DELETE /api/auth/addresses/<pk>/"""
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Address.objects.get(pk=pk, user=user)
        except Address.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Address not found.")

    def patch(self, request, pk):
        address = self.get_object(pk, request.user)
        serializer = AddressSerializer(address, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        address = self.get_object(pk, request.user)
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Account Deletion ──────────────────────────────────────────────────────────

class DeleteAccountView(APIView):
    """DELETE /api/auth/delete-account/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        serializer = DeleteAccountSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        deletion_type = serializer.validated_data["type"]
        user = request.user

        # Revoke all tokens immediately
        AuthToken.objects.filter(user=user).update(is_revoked=True)

        if deletion_type == "temporary":
            user.deactivate()
            message = "Account deactivated. You can reactivate by logging in within 30 days."
        else:
            user.schedule_permanent_delete()
            from django.conf import settings
            days = getattr(settings, "PERMANENT_DELETE_AFTER_DAYS", 30)
            message = f"Account scheduled for permanent deletion in {days} days."

        return Response({"message": message, "type": deletion_type})


class MediaUploadView(APIView):
    """POST /api/auth/media/upload/ — Upload image to configured storage and return URL."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get("file")
        if not image_file:
            return Response({"message": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)

        content_type = (getattr(image_file, "content_type", "") or "").lower()
        if not content_type.startswith("image/"):
            return Response({"message": "Only image files are allowed."}, status=status.HTTP_400_BAD_REQUEST)

        max_upload_mb = getattr(settings, "MEDIA_UPLOAD_MAX_MB", 10)
        if image_file.size > max_upload_mb * 1024 * 1024:
            return Response(
                {"message": f"Image too large. Maximum allowed size is {max_upload_mb}MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        folder = sanitize_folder(request.data.get("folder") or "uploads/general")
        old_url = (request.data.get("replace_url") or "").strip()

        upload_path = build_upload_path(image_file.name, folder=folder)
        saved_key = default_storage.save(upload_path, image_file)
        file_url = default_storage.url(saved_key)

        if old_url:
            delete_storage_file_if_managed(old_url)

        return Response({"url": file_url}, status=status.HTTP_201_CREATED)


class GoogleOAuthStartView(APIView):
    """GET /api/auth/google/ — Redirect to allauth Google login entrypoint."""
    permission_classes = [AllowAny]

    def get(self, request):
        callback_path = "/api/auth/google/callback/"
        return django_redirect(f"/accounts/google/login/?process=login&next={callback_path}")


# ── Google OAuth Callback ─────────────────────────────────────────────────────

class GoogleOAuthCallbackView(APIView):
    """
    GET /api/auth/google/callback/
    Called by django-allauth after Google login.
    Issues our custom token and redirects to frontend.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # By this point, allauth has authenticated the user and set request.user
        user = request.user
        if not user.is_authenticated:
            login_url = f"{settings.CUSTOMER_FRONTEND_URL.rstrip('/')}/login?error=oauth_failed"
            return django_redirect(login_url)

        token = AuthToken.create_for_user(user, request)

        # Redirect to the correct frontend based on account role.
        role_to_frontend = {
            User.Role.CUSTOMER: settings.CUSTOMER_FRONTEND_URL,
            User.Role.HOTEL_ADMIN: settings.HOTEL_FRONTEND_URL,
            User.Role.DELIVERY_PARTNER: settings.DELIVERY_FRONTEND_URL,
        }
        frontend_url = role_to_frontend.get(user.role, settings.CUSTOMER_FRONTEND_URL).rstrip("/")
        query = urlencode({
            "token": token.access_token,
            "refresh": token.refresh_token,
            "complete": str(user.is_profile_complete).lower(),
        })
        redirect_url = f"{frontend_url}/auth/callback?{query}"
        return django_redirect(redirect_url)
