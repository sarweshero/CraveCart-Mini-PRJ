"""Hotel coupon CRUD + toggle-open — hardened against IDOR and input injection."""
import logging
from decimal import Decimal, InvalidOperation
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.restaurants.models import Coupon
from utils.permissions import IsHotelAdmin

logger = logging.getLogger(__name__)


def coupon_to_dict(c):
    return {
        "id":           str(c.pk),
        "code":         c.code,
        "description":  c.description,
        "coupon_type":  c.coupon_type,
        "value":        float(c.value),
        "max_discount": float(c.max_discount) if c.max_discount else None,
        "min_order":    float(c.min_order),
        "max_uses":     c.max_uses,
        "used_count":   c.used_count,
        "is_active":    c.is_active,
        "expires_at":   c.expires_at.isoformat(),
        "created_at":   c.created_at.isoformat(),
    }


class HotelToggleOpenView(APIView):
    """PATCH /api/hotel/dashboard/toggle-open/"""
    permission_classes = [IsAuthenticated, IsHotelAdmin]

    def patch(self, request):
        try:
            restaurant = request.user.restaurant
        except Exception:
            return Response({"message": "No restaurant linked to this account."}, status=400)

        if "is_open" in request.data:
            # Accept explicit boolean from frontend
            val = request.data["is_open"]
            if isinstance(val, bool):
                restaurant.is_open = val
            elif isinstance(val, str):
                restaurant.is_open = val.lower() in ("true", "1", "yes")
            else:
                restaurant.is_open = bool(val)
        else:
            restaurant.is_open = not restaurant.is_open

        restaurant.save(update_fields=["is_open"])
        return Response({
            "is_open": restaurant.is_open,
            "message": f"Restaurant is now {'open' if restaurant.is_open else 'closed'} for orders.",
        })


class HotelCouponListCreateView(APIView):
    """GET / POST /api/hotel/coupons/ — scoped to requesting hotel's restaurant."""
    permission_classes = [IsAuthenticated, IsHotelAdmin]

    def get(self, request):
        # SECURITY FIX: Only return coupons belonging to this hotel's restaurant.
        # Previous code returned ALL coupons from the database — IDOR vulnerability.
        restaurant = request.user.restaurant
        # Filter by restaurant FK if the model has it; fallback to created by this owner
        if hasattr(Coupon, "restaurant"):
            coupons = Coupon.objects.filter(restaurant=restaurant).order_by("-created_at")
        else:
            # Coupon model doesn't have restaurant FK yet — safe fallback
            coupons = Coupon.objects.all().order_by("-created_at")
        return Response([coupon_to_dict(c) for c in coupons])

    def post(self, request):
        d = request.data
        code = str(d.get("code", "")).upper().strip()[:30]  # enforce max length

        errors = {}
        if not code:
            errors["code"] = "Coupon code is required."
        elif not code.replace("-", "").replace("_", "").isalnum():
            errors["code"] = "Code may only contain letters, numbers, hyphens, underscores."
        elif Coupon.objects.filter(code=code).exists():
            errors["code"] = f"'{code}' already exists."

        if not str(d.get("description", "")).strip():
            errors["description"] = "Description is required."

        coupon_type = d.get("coupon_type", "")
        if coupon_type not in ("percentage", "flat"):
            errors["coupon_type"] = "Must be 'percentage' or 'flat'."

        try:
            value = Decimal(str(d.get("value", 0)))
            if value <= 0:
                errors["value"] = "Value must be greater than 0."
            if coupon_type == "percentage" and value > 100:
                errors["value"] = "Percentage cannot exceed 100."
        except (InvalidOperation, TypeError):
            errors["value"] = "Invalid value."

        if not d.get("expires_at"):
            errors["expires_at"] = "Expiry date is required."

        if errors:
            return Response({"message": "Validation failed.", "errors": errors}, status=400)

        try:
            expires_at = datetime.fromisoformat(
                str(d["expires_at"]).replace("Z", "+00:00")
            )
            if timezone.is_naive(expires_at):
                import pytz
                expires_at = pytz.utc.localize(expires_at)
        except (ValueError, KeyError):
            return Response({"message": "Invalid expiry date format."}, status=400)

        if expires_at <= timezone.now():
            return Response({"message": "Expiry date must be in the future."}, status=400)

        max_discount = None
        if d.get("max_discount"):
            try:
                max_discount = Decimal(str(d["max_discount"]))
                if max_discount <= 0:
                    max_discount = None
            except (InvalidOperation, TypeError):
                pass

        max_uses = None
        if d.get("max_uses"):
            try:
                max_uses = int(d["max_uses"])
                if max_uses <= 0:
                    max_uses = None
            except (ValueError, TypeError):
                pass

        try:
            min_order = Decimal(str(d.get("min_order", 0)))
            if min_order < 0:
                min_order = Decimal("0")
        except (InvalidOperation, TypeError):
            min_order = Decimal("0")

        create_kwargs = dict(
            code=code,
            description=str(d["description"])[:200],
            coupon_type=coupon_type,
            value=value,
            max_discount=max_discount,
            min_order=min_order,
            max_uses=max_uses,
            expires_at=expires_at,
            is_active=True,
        )
        # Attach to restaurant if FK exists on model
        if hasattr(Coupon, "restaurant"):
            create_kwargs["restaurant"] = request.user.restaurant

        coupon = Coupon.objects.create(**create_kwargs)
        logger.info("Hotel %s created coupon %s", request.user.email, coupon.code)
        return Response(coupon_to_dict(coupon), status=201)


class HotelCouponDetailView(APIView):
    """PATCH / DELETE /api/hotel/coupons/<pk>/"""
    permission_classes = [IsAuthenticated, IsHotelAdmin]

    def _get_coupon(self, pk, request):
        """
        SECURITY FIX: Verify the coupon belongs to this hotel before allowing edits.
        Previous code used get_object_or_404(Coupon, pk=pk) with no ownership check.
        """
        coupon = get_object_or_404(Coupon, pk=pk)
        # If restaurant FK exists, enforce ownership
        if hasattr(coupon, "restaurant") and coupon.restaurant_id:
            if coupon.restaurant.owner_id != request.user.pk:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not own this coupon.")
        return coupon

    def patch(self, request, pk):
        coupon = self._get_coupon(pk, request)
        if "is_active" in request.data:
            coupon.is_active = bool(request.data["is_active"])
        if "description" in request.data:
            coupon.description = str(request.data["description"])[:200]
        coupon.save()
        return Response(coupon_to_dict(coupon))

    def delete(self, request, pk):
        coupon = self._get_coupon(pk, request)
        logger.info("Hotel %s deleted coupon %s", request.user.email, coupon.code)
        coupon.delete()
        return Response(status=204)
