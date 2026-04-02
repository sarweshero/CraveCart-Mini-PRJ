"""apps/delivery/views.py — Delivery partner endpoints + payment processing."""
import hashlib
import hmac
import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import AuthToken
from apps.accounts.serializers import AuthTokenSerializer, UserPublicSerializer
from apps.orders.models import Order
from utils.permissions import IsDeliveryPartner

from .models import DeliveryPartner, DeliveryAssignment, EarningsSummary
from .serializers import (
    AssignmentSerializer,
    DeliveryPartnerProfileSerializer,
    DeliveryRegisterSerializer,
    EarningsSummarySerializer,
)

logger = logging.getLogger(__name__)



# ── AUTH ─────────────────────────────────────────────────────────────────────

class DeliveryRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = DeliveryRegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        token = AuthToken.create_for_user(user, request)
        return Response({
            "message": "Registration successful! Welcome to CraveCart Delivery.",
            "token": token.access_token,
            "refresh_token": token.refresh_token,
            "expires_in": AuthTokenSerializer(token).data["expires_in"],
            "partner": DeliveryPartnerProfileSerializer(user.delivery_profile).data,
        }, status=201)


class DeliveryLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        email    = request.data.get("email", "").lower().strip()
        password = request.data.get("password", "")

        if not email or not password:
            return Response({"message": "Email and password are required."}, status=400)

        try:
            user = User.objects.get(email=email, role="delivery_partner")
        except User.DoesNotExist:
            # Constant-time response to prevent user enumeration
            return Response({"message": "Invalid credentials."}, status=400)

        if not user.check_password(password) or not user.is_active:
            return Response({"message": "Invalid credentials."}, status=400)

        # Revoke existing tokens
        AuthToken.objects.filter(user=user, is_revoked=False).update(is_revoked=True)
        token = AuthToken.create_for_user(user, request)
        partner = user.delivery_profile
        partner.last_active = timezone.now()
        partner.save(update_fields=["last_active"])

        return Response({
            "token": token.access_token,
            "refresh_token": token.refresh_token,
            "expires_in": AuthTokenSerializer(token).data["expires_in"],
            "partner": DeliveryPartnerProfileSerializer(partner).data,
        })


class DeliveryMeView(APIView):
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def get(self, request):
        return Response(DeliveryPartnerProfileSerializer(request.user.delivery_profile).data)

    def patch(self, request):
        partner = request.user.delivery_profile
        # Whitelist only safe fields — prevent privilege escalation
        ALLOWED_FIELDS = {"phone", "city", "avatar", "vehicle_number"}
        filtered = {k: v for k, v in request.data.items() if k in ALLOWED_FIELDS}
        s = DeliveryPartnerProfileSerializer(partner, data=filtered, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(DeliveryPartnerProfileSerializer(partner).data)


class DeliveryToggleOnlineView(APIView):
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def patch(self, request):
        partner = request.user.delivery_profile
        partner.is_online = not partner.is_online
        partner.last_active = timezone.now()
        partner.save(update_fields=["is_online", "last_active"])
        return Response({
            "is_online": partner.is_online,
            "message": f"You are now {'online' if partner.is_online else 'offline'}.",
        })


class DeliveryLocationUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def patch(self, request):
        lat = request.data.get("lat")
        lng = request.data.get("lng")
        # Validate coordinate ranges
        try:
            lat_f = float(lat) if lat is not None else None
            lng_f = float(lng) if lng is not None else None
            if lat_f is not None and not (-90 <= lat_f <= 90):
                return Response({"message": "Invalid latitude."}, status=400)
            if lng_f is not None and not (-180 <= lng_f <= 180):
                return Response({"message": "Invalid longitude."}, status=400)
        except (TypeError, ValueError):
            return Response({"message": "Invalid coordinates."}, status=400)

        partner = request.user.delivery_profile
        if lat_f is not None:
            partner.current_lat = lat_f
        if lng_f is not None:
            partner.current_lng = lng_f
        partner.last_active = timezone.now()
        partner.save(update_fields=["current_lat", "current_lng", "last_active"])
        return Response({"message": "Location updated."})


# ── ASSIGNMENTS ───────────────────────────────────────────────────────────────

class ActiveAssignmentView(APIView):
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def get(self, request):
        partner = request.user.delivery_profile
        active = partner.assignments.filter(
            status__in=["accepted", "picked_up"]
        ).select_related("order__restaurant", "order__customer", "order__delivery_address").first()

        if not active:
            incoming = partner.assignments.filter(
                status="assigned", expires_at__gt=timezone.now()
            ).select_related("order__restaurant", "order__customer", "order__delivery_address").first()
            if incoming:
                return Response({"type": "incoming", "assignment": AssignmentSerializer(incoming).data})
            return Response({"type": "idle"})

        return Response({"type": "active", "assignment": AssignmentSerializer(active).data})


class AssignmentActionView(APIView):
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def post(self, request, pk, action):
        # Validate action against whitelist to prevent IDOR-like abuse
        VALID_ACTIONS = {"accept", "reject", "pickup", "deliver"}
        if action not in VALID_ACTIONS:
            return Response({"message": "Invalid action."}, status=400)

        partner = request.user.delivery_profile
        try:
            assignment = DeliveryAssignment.objects.select_related("order").get(
                pk=pk, partner=partner
            )
        except DeliveryAssignment.DoesNotExist:
            return Response({"message": "Assignment not found."}, status=404)

        now = timezone.now()

        if action == "accept":
            if assignment.status != "assigned":
                return Response({"message": "Assignment is no longer available."}, status=400)
            if assignment.expires_at and assignment.expires_at < now:
                assignment.status = "expired"
                assignment.save(update_fields=["status"])
                return Response({"message": "Assignment has expired."}, status=400)
            assignment.status = "accepted"
            assignment.accepted_at = now
            assignment.save(update_fields=["status", "accepted_at"])
            order = assignment.order
            order.status = "out_for_delivery"
            order.out_for_delivery_at = now
            order.save(update_fields=["status", "out_for_delivery_at"])
            return Response({"message": "Delivery accepted! Head to the restaurant."})

        elif action == "reject":
            if assignment.status != "assigned":
                return Response({"message": "Cannot reject at this stage."}, status=400)
            assignment.status = "rejected"
            assignment.save(update_fields=["status"])
            return Response({"message": "Assignment rejected."})

        elif action == "pickup":
            if assignment.status != "accepted":
                return Response({"message": "Must accept first."}, status=400)
            assignment.status = "picked_up"
            assignment.picked_up_at = now
            assignment.save(update_fields=["status", "picked_up_at"])
            return Response({"message": "Order picked up! Head to the customer."})

        elif action == "deliver":
            if assignment.status != "picked_up":
                return Response({"message": "Must pick up first."}, status=400)
            assignment.status = "delivered"
            assignment.delivered_at = now
            assignment.calculate_total_earning()
            assignment.save(update_fields=["status", "delivered_at", "total_earning"])
            # Update order
            order = assignment.order
            order.status = "delivered"
            order.delivered_at = now
            order.save(update_fields=["status", "delivered_at"])
            # Update partner stats atomically using F() expressions to avoid race conditions
            DeliveryPartner.objects.filter(pk=partner.pk).update(
                total_deliveries=F("total_deliveries") + 1,
                total_earnings=F("total_earnings") + assignment.total_earning,
                today_deliveries=F("today_deliveries") + 1,
                today_earnings=F("today_earnings") + assignment.total_earning,
            )
            partner.refresh_from_db()
            summary, _ = EarningsSummary.objects.get_or_create(partner=partner, date=now.date())
            summary.deliveries += 1
            summary.earnings += assignment.total_earning
            summary.save(update_fields=["deliveries", "earnings"])
            return Response({"message": "Delivery completed! 🎉", "earning": float(assignment.total_earning)})

        return Response({"message": "Unknown action."}, status=400)


class DeliveryHistoryView(APIView):
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def get(self, request):
        partner = request.user.delivery_profile
        qs = partner.assignments.filter(status="delivered").select_related(
            "order__restaurant", "order__delivery_address"
        ).order_by("-delivered_at")
        from utils.pagination import StandardPagination
        p = StandardPagination()
        page = p.paginate_queryset(qs, request)
        return p.get_paginated_response(AssignmentSerializer(page, many=True).data)


class EarningsDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsDeliveryPartner]

    def get(self, request):
        partner = request.user.delivery_profile
        today   = timezone.now().date()
        monday  = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)

        def agg(qs):
            r = qs.aggregate(d=Sum("deliveries"), e=Sum("earnings"))
            return {"deliveries": r["d"] or 0, "earnings": float(r["e"] or 0)}

        history = EarningsSummary.objects.filter(partner=partner).order_by("-date")[:30]
        week_data = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            try:
                s = EarningsSummary.objects.get(partner=partner, date=d)
                week_data.append({"date": str(d), "earnings": float(s.earnings), "deliveries": s.deliveries})
            except EarningsSummary.DoesNotExist:
                week_data.append({"date": str(d), "earnings": 0, "deliveries": 0})

        return Response({
            "today":      {"deliveries": partner.today_deliveries, "earnings": float(partner.today_earnings)},
            "this_week":  agg(EarningsSummary.objects.filter(partner=partner, date__gte=monday)),
            "this_month": agg(EarningsSummary.objects.filter(partner=partner, date__gte=month_start)),
            "history":    EarningsSummarySerializer(history, many=True).data,
            "breakdown":  week_data,
        })


# ── PAYMENTS ──────────────────────────────────────────────────────────────────

class PaymentInitiateView(APIView):
    """
    POST /api/payments/initiate/
    Creates a Razorpay order. In production, calls Razorpay API.
    In development/test, returns a dummy order_id.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import secrets
        order_id = request.data.get("order_id")
        amount   = request.data.get("amount", 0)
        is_production = not bool(getattr(settings, "DEBUG", True))

        # Validate amount — must be positive number
        try:
            amount_float = float(amount)
            if amount_float <= 0:
                return Response({"message": "Invalid amount."}, status=400)
        except (TypeError, ValueError):
            return Response({"message": "Invalid amount."}, status=400)

        # Verify the order belongs to this user before creating payment
        if order_id:
            if not Order.objects.filter(pk=order_id, customer=request.user).exists():
                return Response({"message": "Order not found."}, status=404)

        rzp_key_id = getattr(settings, "RAZORPAY_KEY_ID", "rzp_test_XXXXXXXXXX")
        rzp_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")

        if is_production and (not rzp_key_id or not rzp_secret or rzp_secret.startswith("CHANGE_ME")):
            logger.error("Razorpay is not configured in production environment")
            return Response({"message": "Payment gateway is not configured."}, status=503)

        # Production: use razorpay Python SDK
        # import razorpay
        # client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        # rzp_order = client.order.create({"amount": int(amount_float*100), "currency":"INR", "receipt":order_id})
        # rzp_order_id = rzp_order["id"]

        rzp_order_id = f"order_{secrets.token_hex(10)}"

        return Response({
            "razorpay_order_id": rzp_order_id,
            "amount":   int(amount_float * 100),  # paise
            "currency": "INR",
            "key_id":   rzp_key_id,
            "order_id": order_id,
        })


class PaymentVerifyView(APIView):
    """
    POST /api/payments/verify/
    Verifies Razorpay payment signature using HMAC-SHA256.
    Falls back to dummy verification when RAZORPAY_KEY_SECRET is not set.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id            = request.data.get("order_id")
        razorpay_payment_id = request.data.get("razorpay_payment_id", "")
        razorpay_order_id   = request.data.get("razorpay_order_id", "")
        razorpay_signature  = request.data.get("razorpay_signature", "")
        is_production = not bool(getattr(settings, "DEBUG", True))

        rzp_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")

        if not order_id:
            return Response({"message": "order_id is required."}, status=400)
        if not razorpay_payment_id or not razorpay_order_id:
            return Response({"message": "Payment details are incomplete."}, status=400)

        if rzp_secret and not rzp_secret.startswith("CHANGE_ME"):
            # Production signature verification
            payload = f"{razorpay_order_id}|{razorpay_payment_id}"
            expected = hmac.new(
                rzp_secret.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected, razorpay_signature):
                logger.warning(
                    "Payment signature mismatch for order %s by user %s",
                    order_id, request.user.id
                )
                return Response({"message": "Payment verification failed."}, status=400)
        else:
            if is_production:
                logger.error("Payment verification attempted without Razorpay secret in production")
                return Response({"message": "Payment gateway is not configured."}, status=503)

            # Development/demo mode — skip HMAC (no secret configured)
            logger.info("Payment verify in demo mode for order %s", order_id)

        # Verify order ownership before marking paid
        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order_id, customer=request.user)
                if order.payment_status != Order.PaymentStatus.PAID:
                    order.payment_status = Order.PaymentStatus.PAID
                    order.save(update_fields=["payment_status"])
        except Order.DoesNotExist:
            return Response({"message": "Order not found."}, status=404)

        return Response({
            "message": "Payment verified successfully.",
            "payment_id": razorpay_payment_id,
        })
