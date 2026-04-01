"""
Hotel self-registration view — POST /api/hotel/auth/register/
Security: input sanitization, email normalization, duplicate detection, rate limiting.
"""
import logging
import re
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils.text import slugify

User = get_user_model()
logger = logging.getLogger(__name__)

# Max 3 registrations per hour from same IP
class HotelRegisterThrottle(AnonRateThrottle):
    rate  = "3/hour"
    scope = "hotel_register"


class HotelRegisterView(APIView):
    permission_classes  = [AllowAny]
    throttle_classes    = [HotelRegisterThrottle]

    def post(self, request):
        from apps.accounts.models import AuthToken
        from apps.accounts.serializers import AuthTokenSerializer, UserPublicSerializer
        from apps.restaurants.models import Restaurant

        data = request.data

        # ── Required field validation ───────────────────────────────────────
        required = ["email", "password", "name", "restaurant_name", "city"]
        errors = {}
        for field in required:
            if not str(data.get(field, "")).strip():
                errors[field] = f"{field.replace('_', ' ').title()} is required."
        if errors:
            return Response({"message": "Validation failed.", "errors": errors}, status=400)

        email = data["email"].lower().strip()

        # ── Email format validation ─────────────────────────────────────────
        email_re = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_re, email):
            return Response({"message": "Invalid email address.", "errors": {"email": "Enter a valid email."}}, status=400)

        if User.objects.filter(email=email).exists():
            # Don't reveal whether the account is a hotel or customer
            return Response({
                "message": "An account with this email already exists.",
                "errors":  {"email": "Email already registered."},
            }, status=400)

        # ── Password strength validation ────────────────────────────────────
        password = data["password"]
        try:
            validate_password(password)
        except ValidationError as e:
            return Response({
                "message": "Password too weak.",
                "errors":  {"password": list(e.messages)},
            }, status=400)

        # ── Sanitize string inputs ──────────────────────────────────────────
        name            = str(data["name"])[:150].strip()
        restaurant_name = str(data["restaurant_name"])[:200].strip()
        city            = str(data["city"])[:100].strip()
        description     = str(data.get("description", ""))[:500].strip()
        phone           = str(data.get("phone", ""))[:20].strip()
        area            = str(data.get("area", ""))[:100].strip()
        state_val       = str(data.get("state", ""))[:100].strip()
        pincode         = str(data.get("pincode", ""))[:10].strip()
        fssai           = str(data.get("fssai", ""))[:20].strip()
        rest_phone      = str(data.get("restaurant_phone", phone))[:20].strip()
        open_time       = str(data.get("open_time", "09:00 AM"))[:20].strip()
        close_time      = str(data.get("close_time", "10:00 PM"))[:20].strip()

        cuisine_tags = data.get("cuisine_tags", [])
        if isinstance(cuisine_tags, str):
            cuisine_tags = [t.strip() for t in cuisine_tags.split(",") if t.strip()]
        # Sanitize each tag
        cuisine_tags = [str(t)[:50] for t in cuisine_tags[:15]]

        try:
            min_order       = max(0, float(data.get("min_order", 100)))
            delivery_fee    = max(0, float(data.get("delivery_fee", 30)))
            avg_delivery    = max(5, min(180, int(data.get("avg_delivery_time", 30))))
        except (TypeError, ValueError):
            min_order, delivery_fee, avg_delivery = 100, 30, 30

        # ── Create user ─────────────────────────────────────────────────────
        user = User.objects.create_user(
            email    = email,
            password = password,
            name     = name,
            phone    = phone,
            role     = User.Role.HOTEL_ADMIN,
            is_profile_complete = True,
        )

        # ── Generate unique slug ────────────────────────────────────────────
        base_slug = slugify(restaurant_name) or "restaurant"
        slug, counter = base_slug[:200], 1
        while Restaurant.objects.filter(slug=slug).exists():
            slug = f"{base_slug[:196]}-{counter}"
            counter += 1

        Restaurant.objects.create(
            owner             = user,
            name              = restaurant_name,
            slug              = slug,
            description       = description,
            cuisine_tags      = cuisine_tags,
            address           = str(data.get("address", ""))[:500].strip(),
            city              = city,
            area              = area,
            state             = state_val,
            pincode           = pincode,
            phone             = rest_phone,
            timings           = f"{open_time} - {close_time}",
            fssai             = fssai,
            min_order         = min_order,
            delivery_fee      = delivery_fee,
            avg_delivery_time = avg_delivery,
            is_open           = False,   # requires admin review before going live
            is_active         = True,
        )

        token = AuthToken.create_for_user(user, request)
        logger.info("New hotel registration: %s — %s", email, restaurant_name)

        return Response({
            "message": "Registration successful! Your restaurant is under review and will go live within 24 hours.",
            "user":          UserPublicSerializer(user).data,
            "token":         token.access_token,
            "refresh_token": token.refresh_token,
            "expires_in":    AuthTokenSerializer(token).data["expires_in"],
        }, status=status.HTTP_201_CREATED)
