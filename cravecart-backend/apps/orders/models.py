"""apps/orders/models.py"""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.accounts.models import User, Address
from apps.restaurants.models import Restaurant, MenuItem, Coupon


class Cart(models.Model):
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name="cart")
    restaurant = models.ForeignKey(Restaurant, on_delete=models.SET_NULL, null=True, blank=True)
    coupon     = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "carts"

    def __str__(self):
        return f"Cart({self.user.email})"

    @property
    def subtotal(self):
        return sum(item.item_total for item in self.items.all())

    @property
    def delivery_fee(self):
        if not self.restaurant or not self.items.exists():
            return Decimal("0")
        return self.restaurant.delivery_fee

    @property
    def discount(self):
        return self.coupon.calculate_discount(self.subtotal) if self.coupon else Decimal("0")

    @property
    def taxes(self):
        rate = Decimal(str(getattr(settings,"TAX_RATE",0.05)))
        return (self.subtotal * rate).quantize(Decimal("0.01"))

    @property
    def platform_fee(self):
        return Decimal(str(getattr(settings,"PLATFORM_FEE",5)))

    @property
    def total(self):
        return max(Decimal("0"), self.subtotal + self.delivery_fee + self.taxes + self.platform_fee - self.discount)

    def clear(self):
        self.items.all().delete()
        self.restaurant = None
        self.coupon = None
        self.save(update_fields=["restaurant","coupon"])


class CartItem(models.Model):
    cart           = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    menu_item      = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity       = models.PositiveSmallIntegerField(default=1)
    customizations = models.JSONField(default=list)
    added_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cart_items"
        unique_together = [["cart","menu_item"]]

    @property
    def item_total(self):
        extras = sum(
            c.get("price",0) for cust_name in self.customizations
            for c in self.menu_item.customizations if c.get("name")==cust_name
        )
        return (self.menu_item.price + Decimal(str(extras))) * self.quantity


class Order(models.Model):
    class Status(models.TextChoices):
        PLACED           = "placed","Placed"
        CONFIRMED        = "confirmed","Confirmed"
        PREPARING        = "preparing","Preparing"
        OUT_FOR_DELIVERY = "out_for_delivery","Out for Delivery"
        DELIVERED        = "delivered","Delivered"
        CANCELLED        = "cancelled","Cancelled"

    class PaymentMethod(models.TextChoices):
        UPI  = "upi","UPI"
        CARD = "card","Card"
        COD  = "cod","Cash on Delivery"

    class PaymentStatus(models.TextChoices):
        PENDING  = "pending","Pending"
        PAID     = "paid","Paid"
        FAILED   = "failed","Failed"
        REFUNDED = "refunded","Refunded"

    id               = models.CharField(max_length=26, primary_key=True, editable=False)
    customer         = models.ForeignKey(User, on_delete=models.PROTECT, related_name="orders")
    restaurant       = models.ForeignKey(Restaurant, on_delete=models.PROTECT, related_name="orders")
    delivery_address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True)
    items            = models.JSONField()
    subtotal         = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee     = models.DecimalField(max_digits=6, decimal_places=2)
    platform_fee     = models.DecimalField(max_digits=6, decimal_places=2, default=5)
    discount         = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    taxes            = models.DecimalField(max_digits=8, decimal_places=2)
    total            = models.DecimalField(max_digits=10, decimal_places=2)
    coupon_code      = models.CharField(max_length=30, blank=True)
    payment_method   = models.CharField(max_length=10, choices=PaymentMethod.choices)
    payment_status   = models.CharField(max_length=15, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.PLACED)
    instructions     = models.TextField(blank=True)
    placed_at        = models.DateTimeField(auto_now_add=True, db_index=True)
    confirmed_at     = models.DateTimeField(null=True, blank=True)
    preparing_at     = models.DateTimeField(null=True, blank=True)
    out_for_delivery_at = models.DateTimeField(null=True, blank=True)
    delivered_at     = models.DateTimeField(null=True, blank=True)
    cancelled_at     = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "orders"
        ordering = ["-placed_at"]
        indexes  = [models.Index(fields=["customer","status"]), models.Index(fields=["restaurant","status"])]

    def __str__(self):
        return f"Order {self.id}"

    def save(self, *args, **kwargs):
        if not self.id:
            try:
                import ulid
                self.id = str(ulid.new())
            except ImportError:
                self.id = uuid.uuid4().hex[:26].upper()
        super().save(*args, **kwargs)

    @property
    def items_count(self):
        return sum(i.get("quantity",1) for i in self.items)

    @property
    def has_review(self):
        return hasattr(self,"review")

    @property
    def tracking(self):
        steps = [
            ("placed","Order Placed","Your order has been placed successfully",self.placed_at),
            ("confirmed","Order Confirmed","Restaurant has accepted your order",self.confirmed_at),
            ("preparing","Preparing","Your food is being prepared",self.preparing_at),
            ("out_for_delivery","Out for Delivery","Your order is on the way",self.out_for_delivery_at),
            ("delivered","Delivered","Order delivered successfully. Enjoy!",self.delivered_at),
        ]
        return [{"status":s,"label":l,"description":d,"time":t.isoformat() if t else None,"completed":t is not None} for s,l,d,t in steps]

    def advance_status(self):
        from django.utils import timezone
        now = timezone.now()
        trans = {
            self.Status.PLACED:(self.Status.CONFIRMED,"confirmed_at"),
            self.Status.CONFIRMED:(self.Status.PREPARING,"preparing_at"),
            self.Status.PREPARING:(self.Status.OUT_FOR_DELIVERY,"out_for_delivery_at"),
            self.Status.OUT_FOR_DELIVERY:(self.Status.DELIVERED,"delivered_at"),
        }
        if self.status in trans:
            next_s, ts_f = trans[self.status]
            self.status = next_s
            setattr(self, ts_f, now)
            self.save(update_fields=["status",ts_f])
            return next_s
        return None
