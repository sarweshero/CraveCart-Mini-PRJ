from decimal import Decimal

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import Address, User
from apps.orders.models import Cart, CartItem, Order
from apps.restaurants.models import Coupon, MenuCategory, MenuItem, Restaurant


class OrderFlowHardeningTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@example.com",
            password="StrongPass123",
            role=User.Role.CUSTOMER,
            is_profile_complete=True,
            name="Customer",
        )
        self.hotel_owner = User.objects.create_user(
            email="hotel@example.com",
            password="StrongPass123",
            role=User.Role.HOTEL_ADMIN,
            is_profile_complete=True,
            name="Hotel",
        )
        self.restaurant = Restaurant.objects.create(
            owner=self.hotel_owner,
            name="Test Kitchen",
            slug="test-kitchen",
            city="Coimbatore",
            delivery_fee=Decimal("30.00"),
            is_active=True,
            is_open=True,
        )
        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Main",
            icon="🍛",
            order=1,
        )
        self.item = MenuItem.objects.create(
            category=self.category,
            name="Veg Meals",
            price=Decimal("200.00"),
            is_available=True,
        )
        self.address = Address.objects.create(
            user=self.customer,
            label=Address.Label.HOME,
            line1="Line 1",
            city="Coimbatore",
            state="Tamil Nadu",
            pincode="641001",
            is_default=True,
        )

        self.cart = Cart.objects.create(user=self.customer, restaurant=self.restaurant)
        CartItem.objects.create(cart=self.cart, menu_item=self.item, quantity=1, customizations=[])

        self.client.force_authenticate(user=self.customer)

    def test_place_order_rejects_exhausted_coupon(self):
        coupon = Coupon.objects.create(
            code="FULLUSED",
            description="No more uses",
            coupon_type=Coupon.CouponType.FLAT,
            value=Decimal("50.00"),
            min_order=Decimal("100.00"),
            max_uses=1,
            used_count=1,
            is_active=True,
            expires_at=timezone.now() + timezone.timedelta(days=1),
        )
        self.cart.coupon = coupon
        self.cart.save(update_fields=["coupon"])

        resp = self.client.post(
            "/api/orders/",
            {
                "delivery_address_id": self.address.id,
                "payment_method": Order.PaymentMethod.COD,
                "instructions": "Leave at door",
            },
            format="json",
        )

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["message"], "Coupon usage limit has been reached.")
        self.assertEqual(Order.objects.count(), 0)


class PaymentVerifyHardeningTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="pay-customer@example.com",
            password="StrongPass123",
            role=User.Role.CUSTOMER,
            is_profile_complete=True,
        )
        hotel_owner = User.objects.create_user(
            email="pay-hotel@example.com",
            password="StrongPass123",
            role=User.Role.HOTEL_ADMIN,
            is_profile_complete=True,
        )
        restaurant = Restaurant.objects.create(
            owner=hotel_owner,
            name="Payment Kitchen",
            slug="payment-kitchen",
            city="Coimbatore",
            delivery_fee=Decimal("30.00"),
            is_active=True,
            is_open=True,
        )
        address = Address.objects.create(
            user=self.customer,
            label=Address.Label.HOME,
            line1="Line 1",
            city="Coimbatore",
            state="Tamil Nadu",
            pincode="641001",
            is_default=True,
        )
        self.order = Order.objects.create(
            customer=self.customer,
            restaurant=restaurant,
            delivery_address=address,
            items=[{"name": "Veg Meals", "quantity": 1, "price": 200.0, "customizations": [], "item_total": 200.0}],
            subtotal=Decimal("200.00"),
            delivery_fee=Decimal("30.00"),
            platform_fee=Decimal("5.00"),
            discount=Decimal("0.00"),
            taxes=Decimal("10.00"),
            total=Decimal("245.00"),
            payment_method=Order.PaymentMethod.UPI,
            payment_status=Order.PaymentStatus.PENDING,
        )
        self.client.force_authenticate(user=self.customer)

    @override_settings(DEBUG=False, RAZORPAY_KEY_SECRET="")
    def test_verify_requires_gateway_secret_in_production(self):
        resp = self.client.post(
            "/api/payments/verify/",
            {
                "order_id": self.order.id,
                "razorpay_order_id": "order_test",
                "razorpay_payment_id": "pay_test",
                "razorpay_signature": "sig_test",
            },
            format="json",
        )

        self.assertEqual(resp.status_code, 503)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PENDING)
