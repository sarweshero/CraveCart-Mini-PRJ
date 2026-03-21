"""
apps/reviews/tasks.py
Celery tasks for the AI review response pipeline.

Flow:
  ReviewCreateView.post()
    └─ generate_and_send_ai_response.delay(review_id)
         ├─ generate_review_response_safe()   → Gemini AI call
         ├─ Create AIResponse record
         └─ send_review_response_email()      → SMTP (batched)
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    name="reviews.generate_and_send_ai_response",
    bind=True,
    max_retries=3,
    default_retry_delay=60,   # retry after 60s on failure
)
def generate_and_send_ai_response(self, review_id: int):
    """
    Main pipeline task: generate AI response → save → send email.
    Called immediately after a customer submits a review.
    """
    from apps.reviews.models import Review, AIResponse
    from apps.reviews.ai_service import generate_review_response_safe
    from apps.notifications.services import EmailService

    try:
        review = Review.objects.select_related(
            "customer", "restaurant", "order"
        ).get(pk=review_id)
    except Review.DoesNotExist:
        logger.error(f"Review {review_id} not found — task aborted.")
        return

    # Skip if already has a completed response
    try:
        existing = review.ai_response
        if existing.generation_status == AIResponse.GenerationStatus.COMPLETED:
            logger.info(f"Review {review_id} already has AI response — skipping.")
            return
    except AIResponse.DoesNotExist:
        pass

    logger.info(f"Generating AI response for review {review_id}…")

    # ── Generate ──────────────────────────────────────────────────────────────
    text, error = generate_review_response_safe(review)

    if error:
        AIResponse.objects.update_or_create(
            review=review,
            defaults={
                "text":               "",
                "generation_status":  AIResponse.GenerationStatus.FAILED,
                "generation_error":   error,
            },
        )
        logger.error(f"AI generation failed for review {review_id}: {error}")
        # Retry the task
        raise self.retry(exc=RuntimeError(error))

    # ── Save AI response ──────────────────────────────────────────────────────
    # Get active template for attribution
    from apps.ai_templates.models import AITemplate
    template = AITemplate.objects.filter(
        restaurant=review.restaurant, is_active=True
    ).first()

    ai_resp, _ = AIResponse.objects.update_or_create(
        review=review,
        defaults={
            "text":               text,
            "template_used":      template,
            "generation_status":  AIResponse.GenerationStatus.COMPLETED,
            "generation_error":   "",
        },
    )

    logger.info(f"AI response saved for review {review_id}. Queuing email…")

    # ── Send email ────────────────────────────────────────────────────────────
    try:
        EmailService.send_review_response_email(review, ai_resp)
    except Exception as email_err:
        logger.error(f"Email send failed for review {review_id}: {email_err}")
        # Don't retry the whole task just for email failure
        # The hotel can resend manually from the dashboard
