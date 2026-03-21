"""
apps/reviews/ai_service.py
Google Gemini AI integration for personalized review response generation.

This is the core novelty of CraveCart.
When a customer submits a review, this service:
1. Loads the hotel's active AI template (prompt instructions + tone)
2. Constructs a rich contextual prompt
3. Calls Google Gemini 1.5 Flash
4. Returns the generated response text
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_review_response(review) -> str:
    """
    Generate a personalized AI response to a customer review.

    Args:
        review: Review model instance (with related restaurant, customer, order)

    Returns:
        str: The AI-generated response text

    Raises:
        RuntimeError: If Gemini API call fails after retries
    """
    import google.generativeai as genai

    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    genai.configure(api_key=api_key)

    # ── Load hotel's active template ──────────────────────────────────────────
    try:
        from apps.ai_templates.models import AITemplate
        template = AITemplate.objects.filter(
            restaurant=review.restaurant, is_active=True
        ).first()
    except Exception:
        template = None

    tone_instructions = (
        template.prompt_instructions
        if template
        else "Respond warmly, professionally and personally. Keep response under 150 words."
    )

    # ── Build system prompt ───────────────────────────────────────────────────
    system_prompt = f"""You are the AI representative for {review.restaurant.name}, responding to a customer review on a food delivery platform.

RESTAURANT CONTEXT:
- Restaurant name: {review.restaurant.name}
- Cuisine: {", ".join(review.restaurant.cuisine_tags) if review.restaurant.cuisine_tags else "Various"}
- City: {review.restaurant.city}

TONE & STYLE INSTRUCTIONS FROM THE RESTAURANT:
{tone_instructions}

STRICT RULES:
1. Always address the customer by their first name: {review.customer.name.split()[0]}
2. Reference specific dishes or aspects mentioned in the review
3. Keep response between 80–160 words
4. End with a warm invitation to order again
5. Use emojis sparingly (1–2 max)
6. Never make up facts about the restaurant
7. If rating is 1–2 stars, be empathetic, apologize, and assure improvement
8. If rating is 3 stars, acknowledge feedback constructively
9. If rating is 4–5 stars, express genuine gratitude and reinforce the positives

CUSTOMER REVIEW:
- Customer name: {review.customer.name}
- Rating: {review.rating}/5 stars
- Review: "{review.comment}"

Write the response now (plain text, no quotation marks, no preamble):"""

    # ── Call Gemini ───────────────────────────────────────────────────────────
    model_name   = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
    max_tokens   = getattr(settings, "GEMINI_MAX_OUTPUT_TOKENS", 300)

    generation_config = genai.GenerationConfig(
        max_output_tokens = max_tokens,
        temperature       = 0.75,   # Creative but consistent
        top_p             = 0.9,
        top_k             = 40,
    )

    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT",       "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH",      "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT","threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT","threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]

    model    = genai.GenerativeModel(model_name)
    response = model.generate_content(
        system_prompt,
        generation_config = generation_config,
        safety_settings   = safety_settings,
    )

    text = response.text.strip()

    if not text:
        raise RuntimeError("Gemini returned an empty response.")

    # Track template usage
    if template:
        from apps.ai_templates.models import AITemplate
        AITemplate.objects.filter(pk=template.pk).update(usage_count=template.usage_count + 1)

    logger.info(
        f"Generated AI response for review {review.id} "
        f"(restaurant={review.restaurant.name}, rating={review.rating})"
    )
    return text


def generate_review_response_safe(review) -> tuple[str | None, str | None]:
    """
    Safe wrapper — returns (text, error_message).
    Use this in tasks to avoid unhandled exceptions.
    """
    try:
        return generate_review_response(review), None
    except Exception as e:
        logger.error(f"AI generation failed for review {review.id}: {e}", exc_info=True)
        return None, str(e)
