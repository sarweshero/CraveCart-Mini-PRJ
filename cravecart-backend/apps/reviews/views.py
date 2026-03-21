"""apps/reviews/views.py"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .models import Review, AIResponse
from .serializers import ReviewCreateSerializer, ReviewSerializer, AIResponseSerializer
from utils.permissions import IsHotelAdmin, IsCustomer
from utils.pagination import StandardPagination


# ── Customer ──────────────────────────────────────────────────────────────────

class ReviewCreateView(APIView):
    """
    POST /api/reviews/
    Customer submits a review for a delivered order.
    Triggers async AI response generation via Celery.
    """
    permission_classes = [IsAuthenticated, IsCustomer]

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        # Update restaurant denormalized rating
        _update_restaurant_rating(review.restaurant)

        # Trigger async AI response generation + email dispatch
        from apps.reviews.tasks import generate_and_send_ai_response
        generate_and_send_ai_response.delay(review.id)

        return Response({
            "id":      review.id,
            "message": "Review submitted. AI response is being generated…",
            "review":  ReviewSerializer(review).data,
        }, status=status.HTTP_201_CREATED)


class ReviewAIResponseStatusView(APIView):
    """
    GET /api/reviews/<pk>/ai-response/
    Poll for AI response completion status.
    Frontend polls every ~3 seconds until status == 'completed'.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        review = get_object_or_404(Review, pk=pk, customer=request.user)
        try:
            ai_resp = review.ai_response
            return Response({
                "status":      ai_resp.generation_status,
                "ai_response": AIResponseSerializer(ai_resp).data if ai_resp.generation_status == "completed" else None,
            })
        except AIResponse.DoesNotExist:
            return Response({"status": "pending", "ai_response": None})


# ── Hotel ─────────────────────────────────────────────────────────────────────

class HotelReviewListView(APIView):
    """GET /api/hotel/reviews/ — All reviews for this hotel."""
    permission_classes = [IsAuthenticated, IsHotelAdmin]

    def get(self, request):
        restaurant = request.user.restaurant
        reviews = (
            Review.objects
            .filter(restaurant=restaurant)
            .select_related("customer", "ai_response")
            .order_by("-created_at")
        )

        # Optional filters
        rating_filter = request.query_params.get("rating")
        if rating_filter:
            reviews = reviews.filter(rating=int(rating_filter))

        has_response = request.query_params.get("has_response")
        if has_response == "true":
            reviews = reviews.filter(ai_response__isnull=False)
        elif has_response == "false":
            reviews = reviews.filter(ai_response__isnull=True)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(reviews, request)

        data = [
            {
                "id":       r.id,
                "order_id": r.order_id,
                "customer": {
                    "name":   r.customer.name,
                    "email":  r.customer.email,
                    "avatar": r.customer.avatar,
                },
                "rating":     r.rating,
                "comment":    r.comment,
                "created_at": r.created_at.isoformat(),
                "ai_response": AIResponseSerializer(r.ai_response).data
                               if hasattr(r, "ai_response") else None,
            }
            for r in page
        ]
        return paginator.get_paginated_response(data)


class HotelGenerateAIResponseView(APIView):
    """
    POST /api/hotel/reviews/<pk>/generate-ai-response/
    Hotel manually triggers (or re-triggers) AI response generation.
    """
    permission_classes = [IsAuthenticated, IsHotelAdmin]

    def post(self, request, pk):
        review = get_object_or_404(Review, pk=pk, restaurant=request.user.restaurant)

        # If an existing response, delete it so we regenerate
        try:
            review.ai_response.delete()
        except AIResponse.DoesNotExist:
            pass

        template_id = request.data.get("template_id")

        # Generate synchronously here so hotel gets instant feedback
        # (in production this can be async if needed)
        from apps.reviews.ai_service import generate_review_response_safe
        text, error = generate_review_response_safe(review)

        if error:
            ai_resp = AIResponse.objects.create(
                review=review,
                text="",
                generation_status=AIResponse.GenerationStatus.FAILED,
                generation_error=error,
            )
            return Response(
                {"message": "AI generation failed.", "error": error},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Attach template if specified
        template = None
        if template_id:
            from apps.ai_templates.models import AITemplate
            try:
                template = AITemplate.objects.get(pk=template_id, restaurant=request.user.restaurant)
            except AITemplate.DoesNotExist:
                pass

        ai_resp = AIResponse.objects.create(
            review            = review,
            text              = text,
            template_used     = template,
            generation_status = AIResponse.GenerationStatus.COMPLETED,
        )

        return Response({
            "ai_response": AIResponseSerializer(ai_resp).data,
        })


class HotelSendAIResponseView(APIView):
    """
    POST /api/hotel/reviews/<pk>/send-response/
    Sends the AI response email to the customer (CC to hotel).
    """
    permission_classes = [IsAuthenticated, IsHotelAdmin]

    def post(self, request, pk):
        review = get_object_or_404(Review, pk=pk, restaurant=request.user.restaurant)

        try:
            ai_resp = review.ai_response
        except AIResponse.DoesNotExist:
            return Response({"message": "No AI response generated yet."}, status=400)

        if ai_resp.email_sent:
            return Response({"message": "Email already sent.", "email_sent": True})

        from apps.notifications.services import EmailService
        EmailService.send_review_response_email(review, ai_resp)

        return Response({"message": "Email sent successfully.", "email_sent": True})


# ── Helpers ───────────────────────────────────────────────────────────────────

def _update_restaurant_rating(restaurant):
    """Recompute and save denormalized rating after new review."""
    from django.db.models import Avg, Count
    agg = Review.objects.filter(restaurant=restaurant).aggregate(
        avg=Avg("rating"), count=Count("id")
    )
    restaurant.rating_avg   = round(agg["avg"] or 0, 1)
    restaurant.rating_count = agg["count"] or 0
    restaurant.save(update_fields=["rating_avg", "rating_count"])
