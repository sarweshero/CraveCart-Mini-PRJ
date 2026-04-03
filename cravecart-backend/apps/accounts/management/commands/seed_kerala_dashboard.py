"""
management/commands/seed_kerala_dashboard.py

Seeds dashboard-ready data for Kerala Boat House hotel admin:
  - Live orders (placed/confirmed/preparing/out_for_delivery)
  - Delivered orders spread across today/week/month for stats cards
  - Reviews + rating breakdown for the rating overview widget

Target account: admin@keralaboathouse.in
"""

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Avg, Count
from django.utils import timezone


TARGET_ADMIN_EMAIL = "admin@keralaboathouse.in"
DEMO_PASSWORD = "demo1234"
SEED_PREFIX = "[KERALA-DASHBOARD-SEED]"


CUSTOMER_SEED_DATA = [
    {
        "key": "arjun",
        "email": "arjun.kumar@gmail.com",
        "name": "Arjun Kumar",
        "phone": "9876543210",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=arjun",
        "address": {
            "label": "Home",
            "line1": "42, Sai Nagar",
            "line2": "Near Ganesh Temple",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "pincode": "641011",
        },
    },
    {
        "key": "priya",
        "email": "priya.suresh@gmail.com",
        "name": "Priya Suresh",
        "phone": "9898981234",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
        "address": {
            "label": "Work",
            "line1": "18, Info Tech Park",
            "line2": "Avinashi Main Road",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "pincode": "641014",
        },
    },
    {
        "key": "meera",
        "email": "meera.nair@gmail.com",
        "name": "Meera Nair",
        "phone": "9000012345",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=meera",
        "address": {
            "label": "Home",
            "line1": "12, Brookefields Lane",
            "line2": "RS Puram",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "pincode": "641002",
        },
    },
    {
        "key": "faizan",
        "email": "faizan.ali@gmail.com",
        "name": "Faizan Ali",
        "phone": "9000012346",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=faizan",
        "address": {
            "label": "Home",
            "line1": "8, Lake View Colony",
            "line2": "Sungam",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "pincode": "641001",
        },
    },
    {
        "key": "neha",
        "email": "neha.ravi@gmail.com",
        "name": "Neha Ravi",
        "phone": "9000012347",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=neha",
        "address": {
            "label": "Work",
            "line1": "29, Tidel Park Phase 2",
            "line2": "Peelamedu",
            "city": "Coimbatore",
            "state": "Tamil Nadu",
            "pincode": "641004",
        },
    },
]


ORDER_SEED_DATA = [
    {
        "customer": "arjun",
        "status": "placed",
        "payment_method": "upi",
        "payment_status": "pending",
        "minutes_ago": 18,
        "items": [("Malabar Chicken Curry", 1), ("Appam (3 pcs)", 1)],
        "note": "Less spicy if possible.",
    },
    {
        "customer": "priya",
        "status": "confirmed",
        "payment_method": "card",
        "payment_status": "paid",
        "minutes_ago": 32,
        "items": [("Fish Pollichathu", 1), ("Appam (3 pcs)", 1)],
        "note": "Pack curry separately.",
    },
    {
        "customer": "meera",
        "status": "preparing",
        "payment_method": "cod",
        "payment_status": "pending",
        "minutes_ago": 48,
        "items": [("Avial", 1), ("Parotta with Egg Roast", 1)],
        "note": "No cutlery needed.",
    },
    {
        "customer": "faizan",
        "status": "out_for_delivery",
        "payment_method": "netbanking",
        "payment_status": "paid",
        "minutes_ago": 66,
        "items": [("Fish Pollichathu", 1), ("Avial", 1)],
        "note": "Call once rider reaches gate.",
    },
    {
        "customer": "neha",
        "status": "delivered",
        "payment_method": "upi",
        "payment_status": "paid",
        "minutes_ago": 145,
        "items": [("Malabar Chicken Curry", 1), ("Appam (3 pcs)", 2)],
        "note": "Fresh and hot delivery.",
        "review": {
            "rating": 5,
            "comment": "Absolutely loved the Malabar curry. Appams were soft and fresh.",
            "minutes_after_delivery": 45,
        },
    },
    {
        "customer": "arjun",
        "status": "delivered",
        "payment_method": "card",
        "payment_status": "paid",
        "minutes_ago": 255,
        "items": [("Fish Pollichathu", 1), ("Appam (3 pcs)", 1)],
        "note": "Great fish flavor.",
        "review": {
            "rating": 4,
            "comment": "Fish was tasty and smoky. Delivery was quick too.",
            "minutes_after_delivery": 80,
        },
    },
    {
        "customer": "priya",
        "status": "delivered",
        "payment_method": "upi",
        "payment_status": "paid",
        "minutes_ago": 420,
        "items": [("Avial", 1), ("Appam (3 pcs)", 1)],
        "note": "Balanced and light meal.",
        "review": {
            "rating": 5,
            "comment": "Authentic Kerala taste and very neat packaging.",
            "minutes_after_delivery": 90,
        },
    },
    {
        "customer": "meera",
        "status": "delivered",
        "payment_method": "card",
        "payment_status": "paid",
        "minutes_ago": 60 * 24 * 2 + 120,
        "items": [("Parotta with Egg Roast", 1), ("Appam (3 pcs)", 1)],
        "note": "Good portion size.",
        "review": {
            "rating": 4,
            "comment": "Egg roast was good and the parotta stayed flaky.",
            "minutes_after_delivery": 120,
        },
    },
    {
        "customer": "faizan",
        "status": "delivered",
        "payment_method": "netbanking",
        "payment_status": "paid",
        "minutes_ago": 60 * 24 * 3 + 180,
        "items": [("Fish Pollichathu", 1), ("Parotta with Egg Roast", 1)],
        "note": "Nicely packed.",
        "review": {
            "rating": 5,
            "comment": "One of the best seafood meals I have had recently.",
            "minutes_after_delivery": 75,
        },
    },
    {
        "customer": "neha",
        "status": "delivered",
        "payment_method": "upi",
        "payment_status": "paid",
        "minutes_ago": 60 * 24 * 5 + 210,
        "items": [("Avial", 1), ("Appam (3 pcs)", 1)],
        "note": "Please keep it mild.",
        "review": {
            "rating": 3,
            "comment": "Good taste overall, but appam got a little cold.",
            "minutes_after_delivery": 130,
        },
    },
    {
        "customer": "arjun",
        "status": "delivered",
        "payment_method": "card",
        "payment_status": "paid",
        "minutes_ago": 60 * 24 * 9 + 160,
        "items": [("Malabar Chicken Curry", 1), ("Parotta with Egg Roast", 1)],
        "note": "Add extra gravy.",
        "review": {
            "rating": 4,
            "comment": "Rich curry and nice spice level. Very satisfying meal.",
            "minutes_after_delivery": 120,
        },
    },
    {
        "customer": "priya",
        "status": "delivered",
        "payment_method": "upi",
        "payment_status": "paid",
        "minutes_ago": 60 * 24 * 14 + 140,
        "items": [("Fish Pollichathu", 1), ("Appam (3 pcs)", 1)],
        "note": "Loved the aroma.",
        "review": {
            "rating": 5,
            "comment": "Perfectly cooked fish and great banana-leaf flavor.",
            "minutes_after_delivery": 100,
        },
    },
    {
        "customer": "meera",
        "status": "delivered",
        "payment_method": "cod",
        "payment_status": "paid",
        "minutes_ago": 60 * 24 * 21 + 200,
        "items": [("Avial", 1), ("Appam (3 pcs)", 2)],
        "note": "Family dinner order.",
        "review": {
            "rating": 2,
            "comment": "Flavor was okay, but the order arrived later than expected.",
            "minutes_after_delivery": 95,
        },
    },
    {
        "customer": "faizan",
        "status": "delivered",
        "payment_method": "netbanking",
        "payment_status": "paid",
        "minutes_ago": 60 * 24 * 27 + 180,
        "items": [("Parotta with Egg Roast", 1), ("Appam (3 pcs)", 1)],
        "note": "Repeat order.",
        "review": {
            "rating": 5,
            "comment": "Very consistent quality. This is my go-to Kerala meal.",
            "minutes_after_delivery": 90,
        },
    },
]


class Command(BaseCommand):
    help = "Seed Kerala Boat House dashboard data for admin@keralaboathouse.in"

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        from apps.accounts.models import Address
        from apps.orders.models import Order
        from apps.restaurants.models import MenuItem
        from apps.reviews.models import Review

        User = get_user_model()

        self.stdout.write(self.style.MIGRATE_HEADING("Seeding Kerala Boat House dashboard data..."))

        try:
            owner = User.objects.select_related("restaurant").get(email=TARGET_ADMIN_EMAIL)
        except User.DoesNotExist as exc:
            raise CommandError(
                f"Hotel admin '{TARGET_ADMIN_EMAIL}' not found. Run seed_data first."
            ) from exc

        if not hasattr(owner, "restaurant"):
            raise CommandError(
                f"User '{TARGET_ADMIN_EMAIL}' does not have a linked restaurant profile."
            )

        restaurant = owner.restaurant
        menu_items = {
            item.name: item
            for item in MenuItem.objects.filter(category__restaurant=restaurant).select_related("category")
        }
        if not menu_items:
            raise CommandError(
                "No menu items found for Kerala Boat House. Run seed_data first to create menu data."
            )

        with transaction.atomic():
            customers = self._seed_customers(User, Address)
            deleted_count, _ = Order.objects.filter(
                restaurant=restaurant,
                instructions__startswith=SEED_PREFIX,
            ).delete()
            if deleted_count:
                self.stdout.write(f"  cleaned: {deleted_count} existing Kerala dashboard seed orders")

            created_orders, created_reviews = self._seed_orders_and_reviews(
                restaurant=restaurant,
                customers=customers,
                menu_items=menu_items,
                order_model=Order,
                review_model=Review,
            )
            self._refresh_rating_summary(restaurant, Review)

        self.stdout.write(self.style.SUCCESS("✅ Kerala dashboard seed complete!"))
        self.stdout.write(
            f"  seeded: {created_orders} orders, {created_reviews} reviews for {restaurant.name}"
        )

    def _seed_customers(self, user_model, address_model):
        customers = {}
        for customer_data in CUSTOMER_SEED_DATA:
            user, created = user_model.objects.update_or_create(
                email=customer_data["email"],
                defaults={
                    "name": customer_data["name"],
                    "phone": customer_data["phone"],
                    "role": "customer",
                    "is_profile_complete": True,
                    "is_active": True,
                    "avatar": customer_data["avatar"],
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])

            address_defaults = dict(customer_data["address"])
            address_defaults["is_default"] = True
            label = address_defaults.pop("label")
            address, _ = address_model.objects.update_or_create(
                user=user,
                label=label,
                defaults=address_defaults,
            )
            if not address.is_default:
                address.is_default = True
                address.save(update_fields=["is_default"])

            customers[customer_data["key"]] = {"user": user, "address": address}
            self.stdout.write(f"  {'created' if created else 'updated'}: customer {user.email}")

        return customers

    def _seed_orders_and_reviews(self, restaurant, customers, menu_items, order_model, review_model):
        created_orders = 0
        created_reviews = 0
        now = timezone.now()

        for index, order_data in enumerate(ORDER_SEED_DATA, start=1):
            customer_bundle = customers.get(order_data["customer"])
            if not customer_bundle:
                continue

            items_snapshot, subtotal = self._build_items_snapshot(order_data["items"], menu_items)
            if not items_snapshot:
                self.stdout.write(
                    self.style.WARNING(
                        f"  skipped seed order #{index}: no valid menu items found for restaurant"
                    )
                )
                continue

            delivery_fee = Decimal(str(restaurant.delivery_fee)).quantize(Decimal("0.01"))
            platform_fee = Decimal("5.00")
            taxes = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
            total = (subtotal + delivery_fee + platform_fee + taxes).quantize(Decimal("0.01"))

            placed_at = now - timedelta(minutes=order_data["minutes_ago"])
            instructions = f"{SEED_PREFIX} #{index}: {order_data.get('note', '')}".strip()

            order = order_model.objects.create(
                customer=customer_bundle["user"],
                restaurant=restaurant,
                delivery_address=customer_bundle["address"],
                items=items_snapshot,
                subtotal=subtotal,
                delivery_fee=delivery_fee,
                platform_fee=platform_fee,
                discount=Decimal("0.00"),
                taxes=taxes,
                total=total,
                coupon_code="",
                payment_method=order_data["payment_method"],
                payment_status=order_data["payment_status"],
                status=order_data["status"],
                instructions=instructions,
            )

            timestamps = self._build_order_timestamps(order_data["status"], placed_at, order_model)
            order_model.objects.filter(pk=order.pk).update(**timestamps)
            created_orders += 1

            review_spec = order_data.get("review")
            if order_data["status"] == order_model.Status.DELIVERED and review_spec:
                review, _ = review_model.objects.update_or_create(
                    order=order,
                    defaults={
                        "customer": customer_bundle["user"],
                        "restaurant": restaurant,
                        "rating": review_spec["rating"],
                        "comment": review_spec["comment"],
                    },
                )
                delivered_at = timestamps.get("delivered_at", placed_at)
                review_created_at = delivered_at + timedelta(
                    minutes=review_spec.get("minutes_after_delivery", 30)
                )
                review_model.objects.filter(pk=review.pk).update(created_at=review_created_at)
                created_reviews += 1

        return created_orders, created_reviews

    def _build_items_snapshot(self, item_specs, menu_items):
        items_snapshot = []
        subtotal = Decimal("0.00")
        fallback_item = next(iter(menu_items.values())) if menu_items else None

        for item_name, quantity in item_specs:
            menu_item = menu_items.get(item_name, fallback_item)
            if not menu_item:
                continue
            line_total = (menu_item.price * quantity).quantize(Decimal("0.01"))
            subtotal += line_total
            items_snapshot.append(
                {
                    "name": menu_item.name,
                    "quantity": quantity,
                    "price": float(menu_item.price),
                    "customizations": [],
                    "item_total": float(line_total),
                }
            )

        return items_snapshot, subtotal

    def _build_order_timestamps(self, status, placed_at, order_model):
        timestamps = {"placed_at": placed_at}

        if status in {
            order_model.Status.CONFIRMED,
            order_model.Status.PREPARING,
            order_model.Status.OUT_FOR_DELIVERY,
            order_model.Status.DELIVERED,
            order_model.Status.CANCELLED,
        }:
            timestamps["confirmed_at"] = placed_at + timedelta(minutes=5)

        if status in {
            order_model.Status.PREPARING,
            order_model.Status.OUT_FOR_DELIVERY,
            order_model.Status.DELIVERED,
        }:
            timestamps["preparing_at"] = placed_at + timedelta(minutes=15)

        if status in {order_model.Status.OUT_FOR_DELIVERY, order_model.Status.DELIVERED}:
            timestamps["out_for_delivery_at"] = placed_at + timedelta(minutes=30)

        if status == order_model.Status.DELIVERED:
            timestamps["delivered_at"] = placed_at + timedelta(minutes=50)

        if status == order_model.Status.CANCELLED:
            timestamps["cancelled_at"] = placed_at + timedelta(minutes=18)

        return timestamps

    def _refresh_rating_summary(self, restaurant, review_model):
        aggregate = review_model.objects.filter(restaurant=restaurant).aggregate(
            avg=Avg("rating"),
            count=Count("id"),
        )
        restaurant.rating_avg = round(float(aggregate["avg"] or 0), 1)
        restaurant.rating_count = aggregate["count"] or 0
        restaurant.save(update_fields=["rating_avg", "rating_count"])
