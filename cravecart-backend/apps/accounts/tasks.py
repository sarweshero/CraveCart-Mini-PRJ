"""apps/accounts/tasks.py — Background jobs for auth/account lifecycle."""
import logging
from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(name="accounts.cleanup_expired_tokens")
def cleanup_expired_tokens():
    """Daily: remove access tokens expired > 7 days ago."""
    from .models import AuthToken
    cutoff = timezone.now() - timezone.timedelta(days=7)
    deleted, _ = AuthToken.objects.filter(
        access_expires__lt=cutoff, is_revoked=True
    ).delete()
    logger.info(f"Cleaned up {deleted} expired tokens.")
    return deleted


@shared_task(name="accounts.process_permanent_deletions")
def process_permanent_deletions():
    """
    Daily: permanently delete users whose permanent_delete_at has passed.
    Sends a final confirmation email before deletion.
    """
    from apps.notifications.services import EmailService
    now = timezone.now()

    users_to_delete = User.objects.filter(
        deletion_type=User.DeletionType.PERMANENT,
        permanent_delete_at__lte=now,
        is_active=False,
    )

    count = 0
    for user in users_to_delete:
        try:
            # Send farewell email before wiping data
            EmailService.send_account_deleted_confirmation(user)
            logger.info(f"Permanently deleting user: {user.email}")
            user.delete()
            count += 1
        except Exception as e:
            logger.error(f"Error deleting user {user.email}: {e}")

    logger.info(f"Permanently deleted {count} accounts.")
    return count
