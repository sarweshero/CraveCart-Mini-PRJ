"""
management/commands/seed_data.py
Seeds the database with:
  - Cuisine categories
    - Multiple demo hotel admin accounts + restaurants
    - Demo customer accounts + addresses
    - Rich sample menu items for each restaurant
    - A sample AI template for each restaurant
    - Dummy orders across common order states
"""
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


CUISINE_CATEGORIES = [
    {"name": "South Indian", "icon": "🥘", "color": "#F59E0B", "order": 1},
    {"name": "Biryani",      "icon": "🍛", "color": "#EF4444", "order": 2},
    {"name": "Pizza",        "icon": "🍕", "color": "#F97316", "order": 3},
    {"name": "Burgers",      "icon": "🍔", "color": "#84CC16", "order": 4},
    {"name": "Chinese",      "icon": "🥡", "color": "#8B5CF6", "order": 5},
    {"name": "Desserts",     "icon": "🍰", "color": "#EC4899", "order": 6},
    {"name": "Street Food",  "icon": "🌮", "color": "#06B6D4", "order": 7},
    {"name": "Beverages",    "icon": "☕", "color": "#A78BFA", "order": 8},
]

DEMO_PASSWORD = "demo1234"
DEMO_ORDER_PREFIX = "[DEMO-SEED]"

HOTEL_SEED_DATA = [
    {
        "key": "murugan",
        "owner": {
            "email": "admin@muruganidli.com",
            "name": "Murugan Swaminathan",
            "phone": "9876543210",
        },
        "restaurant": {
            "name": "Murugan Idli Shop",
            "description": "Iconic Coimbatore tiffin house famous for soft idlis and filter coffee since 1948.",
            "cuisine_tags": ["South Indian", "Tiffin", "Vegetarian"],
            "thumbnail": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600",
            "cover_image": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200",
            "address": "No. 77, Bharathiar Road, RS Puram",
            "city": "Coimbatore",
            "area": "RS Puram",
            "state": "Tamil Nadu",
            "pincode": "641002",
            "phone": "+91 422 234 5678",
            "timings": "06:00 AM - 10:00 PM",
            "fssai": "12419992000123",
            "is_open": True,
            "is_featured": True,
            "is_active": True,
            "min_order": 100,
            "delivery_fee": 30,
            "avg_delivery_time": 25,
            "rating_avg": 4.7,
            "rating_count": 2847,
            "discount_type": "percentage",
            "discount_value": 20,
            "discount_label": "20% OFF upto ₹100",
        },
        "menu": [
            {
                "name": "Idli & Dosa",
                "icon": "🥞",
                "items": [
                    {
                        "name": "Soft Idli (2 pieces)",
                        "description": "Classic steamed rice cakes served with sambar and three chutneys",
                        "price": 45,
                        "is_veg": True,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                    {
                        "name": "Ghee Roast Dosa",
                        "description": "Crispy dosa drizzled with generous ghee",
                        "price": 75,
                        "is_veg": True,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                    {
                        "name": "Masala Dosa",
                        "description": "Dosa stuffed with spiced potato filling",
                        "price": 70,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                    {
                        "name": "Rava Dosa",
                        "description": "Crispy semolina dosa with onions",
                        "price": 65,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                ],
            },
            {
                "name": "Rice & Curries",
                "icon": "🍛",
                "items": [
                    {
                        "name": "Mini Meals (Veg)",
                        "description": "Full South Indian meal with rice, sambar, rasam, and curries",
                        "price": 130,
                        "is_veg": True,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                    {
                        "name": "Sambar Rice",
                        "description": "Comfort rice cooked with dal and vegetables",
                        "price": 90,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                    {
                        "name": "Curd Rice",
                        "description": "Tempered curd rice topped with pomegranate",
                        "price": 85,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                ],
            },
            {
                "name": "Beverages",
                "icon": "☕",
                "items": [
                    {
                        "name": "Filter Coffee",
                        "description": "Traditional decoction-based South Indian coffee",
                        "price": 35,
                        "is_veg": True,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                    {
                        "name": "Masala Chai",
                        "description": "Spiced ginger tea with cardamom and tulsi",
                        "price": 25,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                ],
            },
        ],
        "ai_template": {
            "name": "Warm & Grateful",
            "description": "Warm, heritage-focused gratitude responses",
            "tone": "warm",
            "prompt_instructions": "Respond with genuine warmth. Mention our 75+ year heritage. Reference specific dishes or aspects in the review. Express sincere gratitude. End with a heartfelt invitation to return. Use one food emoji.",
        },
    },
    {
        "key": "hyderabadi",
        "owner": {
            "email": "admin@hyderabadidumhouse.com",
            "name": "Ayesha Rahman",
            "phone": "9811122233",
        },
        "restaurant": {
            "name": "Hyderabadi Dum House",
            "description": "Aromatic dum biryanis, slow-cooked gravies, and kebabs inspired by old city recipes.",
            "cuisine_tags": ["Biryani", "Mughlai", "Indian"],
            "thumbnail": "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600",
            "cover_image": "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=1200",
            "address": "14, East Club Road, Gandhipuram",
            "city": "Coimbatore",
            "area": "Gandhipuram",
            "state": "Tamil Nadu",
            "pincode": "641012",
            "phone": "+91 422 245 9922",
            "timings": "11:00 AM - 11:30 PM",
            "fssai": "12420997000891",
            "is_open": True,
            "is_featured": True,
            "is_active": True,
            "min_order": 150,
            "delivery_fee": 45,
            "avg_delivery_time": 35,
            "rating_avg": 4.5,
            "rating_count": 1698,
            "discount_type": "flat",
            "discount_value": 75,
            "discount_label": "Flat ₹75 OFF",
        },
        "menu": [
            {
                "name": "Starters",
                "icon": "🍢",
                "items": [
                    {
                        "name": "Chicken 65",
                        "description": "Crispy fried chicken tossed with curry leaves and green chilli",
                        "price": 210,
                        "is_veg": False,
                        "is_bestseller": True,
                        "is_available": True,
                        "spice_level": "hot",
                    },
                    {
                        "name": "Paneer Tikka",
                        "description": "Smoky paneer cubes marinated in yogurt and spices",
                        "price": 190,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                        "spice_level": "medium",
                    },
                ],
            },
            {
                "name": "Biryani Specials",
                "icon": "🍗",
                "items": [
                    {
                        "name": "Chicken Dum Biryani",
                        "description": "Long-grain basmati layered with masala chicken and cooked on dum",
                        "price": 280,
                        "is_veg": False,
                        "is_bestseller": True,
                        "is_available": True,
                        "spice_level": "medium",
                    },
                    {
                        "name": "Mutton Dum Biryani",
                        "description": "Tender mutton pieces in aromatic saffron rice",
                        "price": 340,
                        "is_veg": False,
                        "is_bestseller": True,
                        "is_available": True,
                        "spice_level": "hot",
                    },
                    {
                        "name": "Veg Dum Biryani",
                        "description": "Fragrant biryani with seasonal vegetables and fried onions",
                        "price": 220,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                        "spice_level": "medium",
                    },
                ],
            },
            {
                "name": "Breads & Gravies",
                "icon": "🥘",
                "items": [
                    {
                        "name": "Butter Naan",
                        "description": "Soft tandoor naan brushed with butter",
                        "price": 45,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                    {
                        "name": "Kadai Paneer",
                        "description": "Cottage cheese with bell peppers in tomato gravy",
                        "price": 210,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                        "spice_level": "medium",
                    },
                ],
            },
            {
                "name": "Desserts",
                "icon": "🍮",
                "items": [
                    {
                        "name": "Double Ka Meetha",
                        "description": "Classic Hyderabadi bread pudding with nuts",
                        "price": 120,
                        "is_veg": True,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                ],
            },
        ],
        "ai_template": {
            "name": "Royal Hospitality",
            "description": "Polite, premium and detail-rich customer responses",
            "tone": "professional",
            "prompt_instructions": "Thank the customer warmly. Mention at least one dish they referred to. Keep tone premium and courteous. Invite them to try a complementary recommendation next time.",
        },
    },
    {
        "key": "stone_oven",
        "owner": {
            "email": "admin@stoneovenpizza.co",
            "name": "Karthik Menon",
            "phone": "9822233344",
        },
        "restaurant": {
            "name": "Stone Oven Pizza Co",
            "description": "Fresh dough, wood-fired pizzas, creamy pasta bowls, and handcrafted sides.",
            "cuisine_tags": ["Pizza", "Italian", "Fast Food"],
            "thumbnail": "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600",
            "cover_image": "https://images.unsplash.com/photo-1548365328-9f547fb0953f?w=1200",
            "address": "102, Avinashi Road, Peelamedu",
            "city": "Coimbatore",
            "area": "Peelamedu",
            "state": "Tamil Nadu",
            "pincode": "641004",
            "phone": "+91 422 278 4455",
            "timings": "12:00 PM - 11:00 PM",
            "fssai": "12422111000345",
            "is_open": True,
            "is_featured": False,
            "is_active": True,
            "min_order": 199,
            "delivery_fee": 40,
            "avg_delivery_time": 32,
            "rating_avg": 4.4,
            "rating_count": 2102,
            "discount_type": "percentage",
            "discount_value": 15,
            "discount_label": "15% OFF on pizzas",
        },
        "menu": [
            {
                "name": "Wood Fired Pizza",
                "icon": "🍕",
                "items": [
                    {
                        "name": "Margherita Pizza",
                        "description": "Tomato, mozzarella and basil",
                        "price": 260,
                        "is_veg": True,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                    {
                        "name": "Farmhouse Pizza",
                        "description": "Onion, capsicum, mushroom and sweet corn",
                        "price": 320,
                        "is_veg": True,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                    {
                        "name": "Pepperoni Pizza",
                        "description": "Loaded with spicy pepperoni and extra cheese",
                        "price": 380,
                        "is_veg": False,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                ],
            },
            {
                "name": "Sides",
                "icon": "🍟",
                "items": [
                    {
                        "name": "Garlic Breadsticks",
                        "description": "Freshly baked breadsticks with garlic butter",
                        "price": 140,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                    {
                        "name": "Peri Peri Fries",
                        "description": "Crispy fries tossed in peri peri seasoning",
                        "price": 120,
                        "is_veg": True,
                        "is_bestseller": True,
                        "is_available": True,
                    },
                ],
            },
            {
                "name": "Pasta",
                "icon": "🍝",
                "items": [
                    {
                        "name": "Penne Alfredo",
                        "description": "Creamy white-sauce pasta with herbs",
                        "price": 250,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                    {
                        "name": "Arrabbiata Chicken Pasta",
                        "description": "Spicy tomato pasta with grilled chicken",
                        "price": 290,
                        "is_veg": False,
                        "is_bestseller": False,
                        "is_available": True,
                        "spice_level": "medium",
                    },
                ],
            },
            {
                "name": "Drinks",
                "icon": "🥤",
                "items": [
                    {
                        "name": "Lemon Iced Tea",
                        "description": "Refreshing black tea with lemon",
                        "price": 90,
                        "is_veg": True,
                        "is_bestseller": False,
                        "is_available": True,
                    },
                ],
            },
        ],
        "ai_template": {
            "name": "Cheerful Pizza Tone",
            "description": "Friendly and upbeat review replies",
            "tone": "friendly",
            "prompt_instructions": "Keep replies concise and cheerful. Thank users, mention one menu highlight, and close with an inviting line to try another signature dish.",
        },
    },
]

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
]

ORDER_SEED_DATA = [
    {
        "customer": "arjun",
        "restaurant": "murugan",
        "status": "placed",
        "payment_method": "upi",
        "payment_status": "pending",
        "minutes_ago": 12,
        "items": [("Ghee Roast Dosa", 1), ("Filter Coffee", 1)],
        "note": "Please pack chutney separately.",
    },
    {
        "customer": "priya",
        "restaurant": "murugan",
        "status": "confirmed",
        "payment_method": "card",
        "payment_status": "paid",
        "minutes_ago": 38,
        "items": [("Mini Meals (Veg)", 1), ("Curd Rice", 1)],
        "note": "Need less spicy curry.",
    },
    {
        "customer": "arjun",
        "restaurant": "hyderabadi",
        "status": "preparing",
        "payment_method": "upi",
        "payment_status": "paid",
        "minutes_ago": 62,
        "items": [("Chicken Dum Biryani", 1), ("Chicken 65", 1)],
        "note": "Include extra raita if possible.",
    },
    {
        "customer": "priya",
        "restaurant": "hyderabadi",
        "status": "out_for_delivery",
        "payment_method": "cod",
        "payment_status": "pending",
        "minutes_ago": 84,
        "items": [("Veg Dum Biryani", 1), ("Paneer Tikka", 1)],
        "note": "Call me when near office gate.",
    },
    {
        "customer": "arjun",
        "restaurant": "stone_oven",
        "status": "delivered",
        "payment_method": "card",
        "payment_status": "paid",
        "minutes_ago": 135,
        "items": [("Farmhouse Pizza", 1), ("Garlic Breadsticks", 1), ("Lemon Iced Tea", 1)],
        "note": "Delivered to security desk.",
    },
    {
        "customer": "priya",
        "restaurant": "stone_oven",
        "status": "cancelled",
        "payment_method": "netbanking",
        "payment_status": "refunded",
        "minutes_ago": 95,
        "items": [("Pepperoni Pizza", 1), ("Peri Peri Fries", 1)],
        "note": "Cancelled due to delay.",
        "cancellation_reason": "Customer requested cancellation due to ETA delay",
    },
]


class Command(BaseCommand):
    help = "Seed database with initial demo data"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding CraveCart database…"))
        with transaction.atomic():
            self._seed_categories()
            restaurants = self._seed_hotels()
            customers = self._seed_customers()
            self._seed_orders(restaurants, customers)
        self.stdout.write(self.style.SUCCESS("✅  Seeding complete!"))

    def _seed_categories(self):
        from apps.restaurants.models import CuisineCategory

        for cat in CUISINE_CATEGORIES:
            obj, created = CuisineCategory.objects.update_or_create(
                name=cat["name"], defaults=cat
            )
            label = "created" if created else "updated"
            self.stdout.write(f"  {label}: {obj.icon} {obj.name}")

    def _seed_hotels(self):
        from django.contrib.auth import get_user_model
        from apps.restaurants.models import Restaurant, MenuCategory, MenuItem
        from apps.ai_templates.models import AITemplate
        from django.utils.text import slugify

        User = get_user_model()
        restaurants = {}

        for hotel in HOTEL_SEED_DATA:
            owner_defaults = {
                "name": hotel["owner"]["name"],
                "phone": hotel["owner"]["phone"],
                "role": "hotel_admin",
                "is_profile_complete": True,
                "is_active": True,
            }
            owner, created_owner = User.objects.update_or_create(
                email=hotel["owner"]["email"], defaults=owner_defaults
            )
            owner.set_password(DEMO_PASSWORD)
            owner.save(update_fields=["password"])
            self.stdout.write(
                f"  {'created' if created_owner else 'updated'}: hotel owner {owner.email}"
            )

            restaurant_defaults = dict(hotel["restaurant"])
            restaurant_defaults["slug"] = slugify(restaurant_defaults["name"])
            restaurant, _ = Restaurant.objects.update_or_create(
                owner=owner,
                defaults=restaurant_defaults,
            )
            restaurants[hotel["key"]] = restaurant
            self.stdout.write(f"  seeded: restaurant {restaurant.name}")

            menu_items_count = 0
            for index, menu_category_data in enumerate(hotel["menu"], start=1):
                menu_category, _ = MenuCategory.objects.update_or_create(
                    restaurant=restaurant,
                    name=menu_category_data["name"],
                    defaults={
                        "icon": menu_category_data.get("icon", ""),
                        "order": index,
                    },
                )
                for item_order, item in enumerate(menu_category_data["items"], start=1):
                    item_defaults = {
                        "description": item["description"],
                        "price": item["price"],
                        "is_veg": item["is_veg"],
                        "is_bestseller": item["is_bestseller"],
                        "is_available": item["is_available"],
                        "spice_level": item.get("spice_level"),
                        "customizations": item.get("customizations", []),
                        "order": item_order,
                    }
                    MenuItem.objects.update_or_create(
                        category=menu_category,
                        name=item["name"],
                        defaults=item_defaults,
                    )
                    menu_items_count += 1
            self.stdout.write(f"  seeded: {menu_items_count} menu items for {restaurant.name}")

            template_defaults = dict(hotel["ai_template"])
            template_name = template_defaults.pop("name")
            template_defaults["is_active"] = True
            AITemplate.objects.update_or_create(
                restaurant=restaurant,
                name=template_name,
                defaults=template_defaults,
            )
            self.stdout.write(f"  seeded: AI template for {restaurant.name}")

        return restaurants

    def _seed_customers(self):
        from django.contrib.auth import get_user_model
        from apps.accounts.models import Address

        User = get_user_model()
        customers = {}

        for customer_data in CUSTOMER_SEED_DATA:
            user, created = User.objects.update_or_create(
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
            address, _ = Address.objects.update_or_create(
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

    def _seed_orders(self, restaurants, customers):
        from apps.orders.models import Order
        from apps.restaurants.models import MenuItem

        demo_users = [data["user"] for data in customers.values()]
        deleted_count, _ = Order.objects.filter(
            customer__in=demo_users,
            instructions__startswith=DEMO_ORDER_PREFIX,
        ).delete()
        if deleted_count:
            self.stdout.write(f"  cleaned: {deleted_count} existing demo orders")

        created_orders = 0
        for index, order_data in enumerate(ORDER_SEED_DATA, start=1):
            customer_bundle = customers.get(order_data["customer"])
            restaurant = restaurants.get(order_data["restaurant"])
            if not customer_bundle or not restaurant:
                continue

            available_items = {
                item.name: item
                for item in MenuItem.objects.filter(category__restaurant=restaurant).select_related("category")
            }

            items_snapshot = []
            subtotal = Decimal("0.00")
            for item_name, quantity in order_data["items"]:
                menu_item = available_items.get(item_name)
                if not menu_item:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  skipped item '{item_name}' for {restaurant.name}: item not found"
                        )
                    )
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

            if not items_snapshot:
                continue

            delivery_fee = Decimal(str(restaurant.delivery_fee)).quantize(Decimal("0.01"))
            platform_fee = Decimal("5.00")
            discount = Decimal(str(order_data.get("discount", 0))).quantize(Decimal("0.01"))
            taxes = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
            total = (subtotal + delivery_fee + platform_fee + taxes - discount).quantize(Decimal("0.01"))
            if total < 0:
                total = Decimal("0.00")

            placed_at = timezone.now() - timedelta(minutes=order_data.get("minutes_ago", 30))
            instructions = f"{DEMO_ORDER_PREFIX} #{index}: {order_data.get('note', '')}".strip()

            order = Order.objects.create(
                customer=customer_bundle["user"],
                restaurant=restaurant,
                delivery_address=customer_bundle["address"],
                items=items_snapshot,
                subtotal=subtotal,
                delivery_fee=delivery_fee,
                platform_fee=platform_fee,
                discount=discount,
                taxes=taxes,
                total=total,
                coupon_code=order_data.get("coupon_code", ""),
                payment_method=order_data["payment_method"],
                payment_status=order_data["payment_status"],
                status=order_data["status"],
                instructions=instructions,
                cancellation_reason=order_data.get("cancellation_reason", ""),
            )

            timestamps = self._build_order_timestamps(order_data["status"], placed_at)
            Order.objects.filter(pk=order.pk).update(**timestamps)
            created_orders += 1

        self.stdout.write(f"  seeded: {created_orders} demo orders across statuses")

    def _build_order_timestamps(self, status, placed_at):
        from apps.orders.models import Order

        timestamps = {"placed_at": placed_at}

        if status in {
            Order.Status.CONFIRMED,
            Order.Status.PREPARING,
            Order.Status.OUT_FOR_DELIVERY,
            Order.Status.DELIVERED,
            Order.Status.CANCELLED,
        }:
            timestamps["confirmed_at"] = placed_at + timedelta(minutes=5)

        if status in {
            Order.Status.PREPARING,
            Order.Status.OUT_FOR_DELIVERY,
            Order.Status.DELIVERED,
        }:
            timestamps["preparing_at"] = placed_at + timedelta(minutes=15)

        if status in {Order.Status.OUT_FOR_DELIVERY, Order.Status.DELIVERED}:
            timestamps["out_for_delivery_at"] = placed_at + timedelta(minutes=30)

        if status == Order.Status.DELIVERED:
            timestamps["delivered_at"] = placed_at + timedelta(minutes=50)

        if status == Order.Status.CANCELLED:
            timestamps["cancelled_at"] = placed_at + timedelta(minutes=18)

        return timestamps
