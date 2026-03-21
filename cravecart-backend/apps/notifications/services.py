"""
apps/notifications/services.py
Centralized email service for CraveCart.
All transactional emails go through this service.
Batching is handled by queueing EmailRecord rows,
then a Celery beat task flushes them every 5 minutes.
"""
import logging
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class EmailService:
    """
    Static-method service class for all CraveCart emails.
    Each method adds an EmailRecord to the batch queue.
    The `flush_email_batch` Celery task delivers them.
    """

    @staticmethod
    def _queue(to: str, subject: str, text_body: str, html_body: str = "",
               cc: list[str] | None = None, metadata: dict | None = None):
        """Add email to the batch queue (EmailRecord)."""
        from apps.notifications.models import EmailRecord
        EmailRecord.objects.create(
            to          = to,
            subject     = subject,
            text_body   = text_body,
            html_body   = html_body,
            cc          = cc or [],
            metadata    = metadata or {},
        )

    # ── Review AI Response Email ──────────────────────────────────────────────

    @staticmethod
    def send_review_response_email(review, ai_response):
        """
        Core novelty email:
        - TO: customer who wrote the review
        - CC: hotel owner's email
        - SUBJECT: "Your review of <Restaurant> — A personal response"
        - BODY: AI-generated response + original review context
        """
        customer       = review.customer
        restaurant     = review.restaurant
        ai_text        = ai_response.text

        subject = f"Your review of {restaurant.name} — A personal response"

        stars = "⭐" * review.rating
        text_body = f"""Hi {customer.name.split()[0]},

Thank you for reviewing {restaurant.name}!

You gave us {review.rating}/5 stars {stars}
Your review: "{review.comment}"

Here's a personal message from {restaurant.name}:

---
{ai_text}
---

This response was crafted by our AI on behalf of {restaurant.name}.

Warm regards,
The CraveCart Team
        """

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#0C0B09;padding:28px 32px;">
          <h1 style="margin:0;color:#E8A830;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
            🍽️ CraveCart
          </h1>
          <p style="margin:4px 0 0;color:#BFB49A;font-size:13px;">Your feedback matters</p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:32px 32px 0;">
          <h2 style="margin:0;color:#1a1a1a;font-size:20px;font-weight:600;">
            Hi {customer.name.split()[0]}, you have a personal response! 👋
          </h2>
          <p style="color:#555;font-size:14px;line-height:1.6;margin:12px 0 0;">
            You recently reviewed <strong>{restaurant.name}</strong>. Here's what they had to say:
          </p>
        </td></tr>

        <!-- Original Review -->
        <tr><td style="padding:20px 32px 0;">
          <div style="background:#f8f8f8;border-radius:12px;padding:16px 20px;border-left:4px solid #E8A830;">
            <p style="margin:0 0 8px;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your Review</p>
            <div style="font-size:20px;margin:0 0 6px;">{'⭐' * review.rating}</div>
            <p style="margin:0;color:#333;font-size:14px;font-style:italic;">"{review.comment}"</p>
          </div>
        </td></tr>

        <!-- AI Response -->
        <tr><td style="padding:20px 32px;">
          <div style="background:#0C0B09;border-radius:14px;padding:24px 24px;">
            <div style="display:flex;align-items:center;margin-bottom:14px;">
              <div style="width:36px;height:36px;background:#E8A830;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;margin-right:12px;font-size:18px;">
                🍽️
              </div>
              <div>
                <p style="margin:0;color:#F5EDD8;font-size:14px;font-weight:600;">{restaurant.name}</p>
                <p style="margin:2px 0 0;color:#9E9080;font-size:11px;">AI-powered personal response</p>
              </div>
            </div>
            <p style="margin:0;color:#F5EDD8;font-size:14px;line-height:1.7;">
              {ai_text.replace(chr(10), '<br>')}
            </p>
          </div>
        </td></tr>

        <!-- Footer note -->
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:12px 0 0;color:#aaa;font-size:11px;line-height:1.5;">
            ✨ This response was generated by Google Gemini AI on behalf of {restaurant.name}.<br>
            Ordered via <a href="https://cravecart.app" style="color:#E8A830;">CraveCart</a> — Food delivered with care.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
        """

        # Queue email (customer TO, hotel CC)
        EmailService._queue(
            to        = customer.email,
            subject   = subject,
            text_body = text_body,
            html_body = html_body,
            cc        = [restaurant.owner.email],
            metadata  = {
                "type":        "review_ai_response",
                "review_id":   review.id,
                "restaurant":  restaurant.name,
            },
        )

        logger.info(
            f"Queued review AI response email: review={review.id}, "
            f"to={customer.email}, cc={restaurant.owner.email}"
        )

    # ── Order Confirmation ────────────────────────────────────────────────────

    @staticmethod
    def send_order_confirmation(order):
        subject   = f"Order Confirmed — #{order.id[:8].upper()}"
        text_body = f"Hi {order.customer.name.split()[0]},\n\nYour order from {order.restaurant.name} has been placed!\nOrder ID: {order.id}\nTotal: ₹{order.total}\nEstimated delivery: {order.restaurant.avg_delivery_time} minutes.\n\nTrack your order at https://cravecart.app/orders/{order.id}\n"
        EmailService._queue(
            to=order.customer.email, subject=subject, text_body=text_body,
            metadata={"type":"order_confirmation","order_id":order.id}
        )

    # ── Order Status Update ───────────────────────────────────────────────────

    @staticmethod
    def send_order_status_update(order):
        status_messages = {
            "confirmed":        "Your order has been confirmed by the restaurant!",
            "preparing":        "Your order is now being prepared. 👨‍🍳",
            "out_for_delivery": "Your order is out for delivery! 🛵",
            "delivered":        "Your order has been delivered. Enjoy your meal! 😋",
            "cancelled":        "Your order has been cancelled.",
        }
        message = status_messages.get(order.status, f"Order status: {order.status}")
        subject = f"Order Update — {message[:40]}"
        text_body = f"Hi {order.customer.name.split()[0]},\n\n{message}\n\nOrder #{order.id[:8].upper()} from {order.restaurant.name}\n\nTrack: https://cravecart.app/orders/{order.id}\n"
        EmailService._queue(
            to=order.customer.email, subject=subject, text_body=text_body,
            metadata={"type":"order_status","order_id":order.id,"status":order.status}
        )

    # ── New Order Alert (Hotel) ───────────────────────────────────────────────

    @staticmethod
    def send_new_order_alert(order):
        restaurant = order.restaurant
        subject    = f"🔔 New Order #{order.id[:8].upper()} — ₹{order.total}"
        items_text = "\n".join([f"  - {i['name']} x{i['quantity']}" for i in order.items])
        text_body  = f"New order received!\n\nOrder #{order.id[:8].upper()}\nCustomer: {order.customer.name}\nItems:\n{items_text}\n\nTotal: ₹{order.total}\nPayment: {order.payment_method.upper()}\nDelivery: {order.delivery_address.line1 if order.delivery_address else 'N/A'}\n\nManage at https://cravecart.app/hotel/dashboard/orders\n"
        EmailService._queue(
            to=restaurant.owner.email, subject=subject, text_body=text_body,
            metadata={"type":"new_order_alert","order_id":order.id}
        )

    # ── Account Deletion Confirmation ─────────────────────────────────────────

    @staticmethod
    def send_account_deleted_confirmation(user):
        subject   = "Your CraveCart account has been deleted"
        text_body = f"Hi {user.name or 'there'},\n\nYour CraveCart account ({user.email}) has been permanently deleted as requested.\n\nAll your data has been removed from our systems.\n\nWe're sorry to see you go. You're always welcome back.\n\nThe CraveCart Team\n"
        EmailService._queue(
            to=user.email, subject=subject, text_body=text_body,
            metadata={"type":"account_deleted"}
        )
