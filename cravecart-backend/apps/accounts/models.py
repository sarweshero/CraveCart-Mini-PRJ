"""
apps/accounts/models.py
Custom User model supporting customers, hotel admins, and delivery partners.
"""
import uuid
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from django.conf import settings


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "customer")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CUSTOMER         = "customer",          "Customer"
        HOTEL_ADMIN      = "hotel_admin",        "Hotel Admin"
        DELIVERY_PARTNER = "delivery_partner",   "Delivery Partner"

    class DeletionType(models.TextChoices):
        NONE      = "none",      "None"
        TEMPORARY = "temporary", "Temporary (Deactivated)"
        PERMANENT = "permanent", "Permanent (Scheduled)"

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email               = models.EmailField(unique=True, db_index=True)
    name                = models.CharField(max_length=150, blank=True)
    phone               = models.CharField(max_length=20, blank=True)
    avatar              = models.URLField(blank=True)
    role                = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    is_profile_complete = models.BooleanField(default=False)
    is_active           = models.BooleanField(default=True)
    is_staff            = models.BooleanField(default=False)
    deletion_type       = models.CharField(max_length=15, choices=DeletionType.choices, default=DeletionType.NONE)
    deletion_requested_at = models.DateTimeField(null=True, blank=True)
    permanent_delete_at   = models.DateTimeField(null=True, blank=True)
    google_id           = models.CharField(max_length=100, blank=True, unique=True, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_customer(self):
        return self.role == self.Role.CUSTOMER

    @property
    def is_hotel_admin(self):
        return self.role == self.Role.HOTEL_ADMIN

    @property
    def is_delivery_partner(self):
        return self.role == self.Role.DELIVERY_PARTNER

    def deactivate(self):
        self.is_active = False
        self.deletion_type = self.DeletionType.TEMPORARY
        self.deletion_requested_at = timezone.now()
        self.save(update_fields=["is_active", "deletion_type", "deletion_requested_at"])

    def schedule_permanent_delete(self):
        days = getattr(settings, "PERMANENT_DELETE_AFTER_DAYS", 30)
        self.is_active = False
        self.deletion_type = self.DeletionType.PERMANENT
        self.deletion_requested_at = timezone.now()
        self.permanent_delete_at = timezone.now() + timedelta(days=days)
        self.save(update_fields=["is_active", "deletion_type", "deletion_requested_at", "permanent_delete_at"])

    def reactivate(self):
        if self.deletion_type == self.DeletionType.TEMPORARY:
            self.is_active = True
            self.deletion_type = self.DeletionType.NONE
            self.deletion_requested_at = None
            self.save(update_fields=["is_active", "deletion_type", "deletion_requested_at"])


class AuthToken(models.Model):
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name="auth_tokens")
    access_token    = models.CharField(max_length=64, unique=True, db_index=True)
    refresh_token   = models.CharField(max_length=64, unique=True, db_index=True)
    access_expires  = models.DateTimeField()
    refresh_expires = models.DateTimeField()
    device_info     = models.CharField(max_length=255, blank=True)
    ip_address      = models.GenericIPAddressField(null=True, blank=True)
    is_revoked      = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)
    last_used_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "auth_tokens"
        indexes = [
            models.Index(fields=["access_token"]),
            models.Index(fields=["refresh_token"]),
            models.Index(fields=["user", "is_revoked"]),
        ]

    def __str__(self):
        return f"Token({self.user.email}, revoked={self.is_revoked})"

    @property
    def is_access_valid(self):
        return not self.is_revoked and self.access_expires > timezone.now()

    @property
    def is_refresh_valid(self):
        return not self.is_revoked and self.refresh_expires > timezone.now()

    def revoke(self):
        self.is_revoked = True
        self.save(update_fields=["is_revoked"])

    @classmethod
    def create_for_user(cls, user, request=None):
        import secrets
        access_days  = getattr(settings, "CRAVECART_TOKEN_EXPIRY_DAYS", 1)
        refresh_days = getattr(settings, "CRAVECART_REFRESH_EXPIRY_DAYS", 30)
        now = timezone.now()
        token = cls.objects.create(
            user           = user,
            access_token   = secrets.token_hex(32),
            refresh_token  = secrets.token_hex(32),
            access_expires = now + timedelta(days=access_days),
            refresh_expires= now + timedelta(days=refresh_days),
            ip_address     = request.META.get("REMOTE_ADDR") if request else None,
            device_info    = (request.META.get("HTTP_USER_AGENT", "")[:255]) if request else "",
        )
        return token


class Address(models.Model):
    class Label(models.TextChoices):
        HOME  = "Home",  "Home"
        WORK  = "Work",  "Work"
        OTHER = "Other", "Other"

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    label      = models.CharField(max_length=10, choices=Label.choices, default=Label.HOME)
    line1      = models.CharField(max_length=255)
    line2      = models.CharField(max_length=255, blank=True)
    city       = models.CharField(max_length=100)
    state      = models.CharField(max_length=100)
    pincode    = models.CharField(max_length=10)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "addresses"
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.label} — {self.line1}, {self.city}"

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(user=self.user, is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)
