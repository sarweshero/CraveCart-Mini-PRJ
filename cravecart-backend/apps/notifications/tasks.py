import logging
from celery import shared_task
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)

@shared_task(name="notifications.flush_email_batch")
def flush_email_batch():
    from apps.notifications.models import EmailRecord
    queued = EmailRecord.objects.filter(status=EmailRecord.Status.QUEUED).order_by("created_at")[:100]
    sent = failed = 0
    for record in queued:
        try:
            msg = EmailMultiAlternatives(
                subject=record.subject,
                body=record.text_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[record.to],
                cc=record.cc or [],
            )
            if record.html_body:
                msg.attach_alternative(record.html_body, "text/html")
            msg.send()
            record.status = EmailRecord.Status.SENT
            record.sent_at = timezone.now()
            sent += 1
        except Exception as e:
            record.status = EmailRecord.Status.FAILED
            record.error = str(e)
            failed += 1
            logger.error(f"Email send failed for record {record.id}: {e}")
        finally:
            record.save(update_fields=["status","sent_at","error"])
    logger.info(f"Email batch: {sent} sent, {failed} failed")
    return {"sent": sent, "failed": failed}

@shared_task(name="notifications.send_new_order_notification")
def send_new_order_notification(order_id: str):
    from apps.orders.models import Order
    from apps.notifications.services import EmailService
    try:
        order = Order.objects.select_related("customer","restaurant__owner","delivery_address").get(pk=order_id)
        EmailService.send_order_confirmation(order)
        EmailService.send_new_order_alert(order)
    except Exception as e:
        logger.error(f"Order notification failed for {order_id}: {e}")

@shared_task(name="notifications.send_order_status_update")
def send_order_status_update(order_id: str):
    from apps.orders.models import Order
    from apps.notifications.services import EmailService
    try:
        order = Order.objects.select_related("customer","restaurant").get(pk=order_id)
        EmailService.send_order_status_update(order)
    except Exception as e:
        logger.error(f"Status update notification failed for {order_id}: {e}")
