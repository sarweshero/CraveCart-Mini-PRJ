"""apps/delivery/models.py — Delivery partner system."""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.accounts.models import User
from apps.orders.models import Order


class DeliveryPartner(models.Model):
    class Status(models.TextChoices):
        ACTIVE    = "active",    "Active"
        INACTIVE  = "inactive",  "Inactive"
        SUSPENDED = "suspended", "Suspended"

    class VehicleType(models.TextChoices):
        BIKE    = "bike",    "Motorcycle"
        BICYCLE = "bicycle", "Bicycle"
        SCOOTER = "scooter", "Scooter"
        FOOT    = "foot",    "On Foot"

    user             = models.OneToOneField(User, on_delete=models.CASCADE, related_name="delivery_profile")
    phone            = models.CharField(max_length=20, blank=True)
    avatar           = models.URLField(blank=True)
    city             = models.CharField(max_length=100, blank=True)
    vehicle_type     = models.CharField(max_length=15, choices=VehicleType.choices, default=VehicleType.BIKE)
    vehicle_number   = models.CharField(max_length=20, blank=True)
    aadhar_number    = models.CharField(max_length=12, blank=True)
    pan_number       = models.CharField(max_length=10, blank=True)
    is_verified      = models.BooleanField(default=False)
    bank_account_number = models.CharField(max_length=18, blank=True)
    bank_ifsc        = models.CharField(max_length=11, blank=True)
    bank_name        = models.CharField(max_length=100, blank=True)
    status           = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    is_online        = models.BooleanField(default=False)
    current_lat      = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_lng      = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    total_deliveries = models.PositiveIntegerField(default=0)
    total_earnings   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rating_avg       = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    rating_count     = models.PositiveIntegerField(default=0)
    today_deliveries = models.PositiveIntegerField(default=0)
    today_earnings   = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    last_active      = models.DateTimeField(null=True, blank=True)
    joined_at        = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "delivery_partners"
        indexes = [models.Index(fields=["is_online", "city"]), models.Index(fields=["status"])]

    def __str__(self):
        return f"Partner({self.user.email})"

    @property
    def acceptance_rate(self):
        qs = self.assignments.filter(status__in=["accepted", "rejected", "expired"])
        total = qs.count()
        if not total:
            return 100
        return round((qs.filter(status="accepted").count() / total) * 100)


class DeliveryAssignment(models.Model):
    class Status(models.TextChoices):
        ASSIGNED  = "assigned",  "Assigned"
        ACCEPTED  = "accepted",  "Accepted"
        REJECTED  = "rejected",  "Rejected"
        EXPIRED   = "expired",   "Expired"
        PICKED_UP = "picked_up", "Picked Up"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order         = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="delivery")
    partner       = models.ForeignKey(DeliveryPartner, on_delete=models.SET_NULL, null=True, related_name="assignments")
    status        = models.CharField(max_length=15, choices=Status.choices, default=Status.ASSIGNED)
    base_earning  = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("25.00"))
    distance_km   = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    bonus         = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_earning = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    pickup_lat    = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    pickup_lng    = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    dropoff_lat   = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    dropoff_lng   = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    assigned_at   = models.DateTimeField(auto_now_add=True)
    accepted_at   = models.DateTimeField(null=True, blank=True)
    picked_up_at  = models.DateTimeField(null=True, blank=True)
    delivered_at  = models.DateTimeField(null=True, blank=True)
    expires_at    = models.DateTimeField(null=True, blank=True)
    customer_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    customer_tip  = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    class Meta:
        db_table = "delivery_assignments"
        ordering = ["-assigned_at"]
        indexes = [models.Index(fields=["partner", "status"]), models.Index(fields=["status", "assigned_at"])]

    def calculate_total_earning(self):
        distance_bonus = max(Decimal("0"), (self.distance_km - 2) * Decimal("5"))
        self.total_earning = self.base_earning + distance_bonus + self.bonus + self.customer_tip
        return self.total_earning


class EarningsSummary(models.Model):
    partner      = models.ForeignKey(DeliveryPartner, on_delete=models.CASCADE, related_name="earnings_history")
    date         = models.DateField(db_index=True)
    deliveries   = models.PositiveSmallIntegerField(default=0)
    earnings     = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    online_hours = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    avg_rating   = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)

    class Meta:
        db_table = "delivery_earnings_summary"
        unique_together = [["partner", "date"]]
        ordering = ["-date"]
