"""apps/restaurants/models.py"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.accounts.models import User


class CuisineCategory(models.Model):
    """Global food categories shown on home page."""
    name  = models.CharField(max_length=50, unique=True)
    icon  = models.CharField(max_length=10)   # emoji
    color = models.CharField(max_length=10, default="#E8A830")
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "cuisine_categories"
        ordering = ["order"]

    def __str__(self):
        return self.name


class Restaurant(models.Model):
    """Restaurant / Hotel profile."""

    owner        = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name="restaurant", limit_choices_to={"role": "hotel_admin"}
    )
    name         = models.CharField(max_length=200, db_index=True)
    slug         = models.SlugField(unique=True, max_length=220)
    description  = models.TextField(blank=True)
    cuisine_tags = models.JSONField(default=list)   # ["South Indian", "Tiffin"]
    thumbnail    = models.URLField(blank=True)
    cover_image  = models.URLField(blank=True)

    # Location
    address      = models.TextField(blank=True)
    city         = models.CharField(max_length=100, db_index=True)
    area         = models.CharField(max_length=100, blank=True)
    state        = models.CharField(max_length=100, blank=True)
    pincode      = models.CharField(max_length=10, blank=True)
    latitude     = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude    = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # Ops
    phone        = models.CharField(max_length=20, blank=True)
    timings      = models.CharField(max_length=100, blank=True, default="09:00 AM - 10:00 PM")
    fssai        = models.CharField(max_length=20, blank=True)
    is_open      = models.BooleanField(default=True)
    is_featured  = models.BooleanField(default=False)
    is_active    = models.BooleanField(default=True)

    # Delivery settings
    min_order    = models.DecimalField(max_digits=8, decimal_places=2, default=100)
    delivery_fee = models.DecimalField(max_digits=6, decimal_places=2, default=30)
    avg_delivery_time = models.PositiveSmallIntegerField(default=30, help_text="Minutes")

    # Discount
    discount_type  = models.CharField(
        max_length=15,
        choices=[("percentage", "Percentage"), ("flat", "Flat")],
        blank=True,
    )
    discount_value = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    discount_label = models.CharField(max_length=100, blank=True)

    # Denormalized rating (updated via signal when new review is created)
    rating_avg   = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    rating_count = models.PositiveIntegerField(default=0)

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "restaurants"
        ordering = ["-is_featured", "-rating_avg"]
        indexes  = [
            models.Index(fields=["city", "is_active"]),
            models.Index(fields=["rating_avg"]),
        ]

    def __str__(self):
        return self.name

    @property
    def discount(self):
        if not self.discount_type:
            return None
        return {
            "type":  self.discount_type,
            "value": float(self.discount_value or 0),
            "label": self.discount_label,
        }


class MenuCategory(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="menu_categories")
    name       = models.CharField(max_length=100)
    icon       = models.CharField(max_length=10, blank=True)
    order      = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "menu_categories"
        ordering = ["order", "name"]
        unique_together = [["restaurant", "name"]]

    def __str__(self):
        return f"{self.restaurant.name} — {self.name}"


class MenuItem(models.Model):
    class SpiceLevel(models.TextChoices):
        MILD       = "mild",       "Mild"
        MEDIUM     = "medium",     "Medium"
        HOT        = "hot",        "Hot"
        EXTRA_HOT  = "extra-hot",  "Extra Hot"

    category        = models.ForeignKey(MenuCategory, on_delete=models.CASCADE, related_name="items")
    name            = models.CharField(max_length=200, db_index=True)
    description     = models.TextField(blank=True)
    price           = models.DecimalField(max_digits=8, decimal_places=2)
    original_price  = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    image           = models.URLField(blank=True)
    is_veg          = models.BooleanField(default=True)
    is_bestseller   = models.BooleanField(default=False)
    is_available    = models.BooleanField(default=True)
    spice_level     = models.CharField(
        max_length=15, choices=SpiceLevel.choices, blank=True, null=True
    )
    customizations  = models.JSONField(
        default=list,
        help_text='[{"name": "Extra Sambar", "price": 10}]'
    )
    order           = models.PositiveSmallIntegerField(default=0)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "menu_items"
        ordering = ["order", "name"]

    def __str__(self):
        return f"{self.category.restaurant.name} — {self.name}"


class Coupon(models.Model):
    class CouponType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage"
        FLAT       = "flat",       "Flat"

    code         = models.CharField(max_length=30, unique=True, db_index=True)
    description  = models.CharField(max_length=200)
    coupon_type  = models.CharField(max_length=15, choices=CouponType.choices)
    value        = models.DecimalField(max_digits=8, decimal_places=2)
    max_discount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    min_order    = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_uses     = models.PositiveIntegerField(null=True, blank=True)
    used_count   = models.PositiveIntegerField(default=0)
    is_active    = models.BooleanField(default=True)
    expires_at   = models.DateTimeField()
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coupons"

    def __str__(self):
        return self.code

    def calculate_discount(self, subtotal):
        from decimal import Decimal
        if self.coupon_type == self.CouponType.PERCENTAGE:
            discount = subtotal * (self.value / Decimal("100"))
            if self.max_discount:
                discount = min(discount, self.max_discount)
        else:
            discount = self.value
        return min(discount, subtotal)
