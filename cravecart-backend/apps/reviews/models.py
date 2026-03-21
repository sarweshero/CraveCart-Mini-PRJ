"""apps/reviews/models.py"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.orders.models import Order
from apps.ai_templates.models import AITemplate


class Review(models.Model):
    order      = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="review")
    customer   = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="reviews")
    rating     = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        db_index=True,
    )
    comment    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reviews"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review({self.customer.email}, {self.rating}★, {self.restaurant.name})"


class AIResponse(models.Model):
    """AI-generated reply to a customer review, sent on behalf of the hotel."""

    class GenerationStatus(models.TextChoices):
        PENDING   = "pending",   "Pending"
        COMPLETED = "completed", "Completed"
        FAILED    = "failed",    "Failed"

    review         = models.OneToOneField(Review, on_delete=models.CASCADE, related_name="ai_response")
    text           = models.TextField()
    template_used  = models.ForeignKey(
        AITemplate, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ai_responses"
    )
    generation_status = models.CharField(
        max_length=15,
        choices=GenerationStatus.choices,
        default=GenerationStatus.PENDING,
    )
    generation_error = models.TextField(blank=True)
    email_sent     = models.BooleanField(default=False)
    email_sent_at  = models.DateTimeField(null=True, blank=True)
    generated_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ai_responses"

    def __str__(self):
        return f"AIResponse(review={self.review_id}, sent={self.email_sent})"
