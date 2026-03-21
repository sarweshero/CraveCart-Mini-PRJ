"""
management/commands/seed_data.py
Seeds the database with:
  - Cuisine categories
  - A demo hotel admin account + restaurant
  - A demo customer account
  - Sample menu items
  - A sample AI template
"""
from django.core.management.base import BaseCommand
from django.db import transaction


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


class Command(BaseCommand):
    help = "Seed database with initial demo data"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding CraveCart database…"))
        with transaction.atomic():
            self._seed_categories()
            self._seed_hotel()
            self._seed_customer()
        self.stdout.write(self.style.SUCCESS("✅  Seeding complete!"))

    def _seed_categories(self):
        from apps.restaurants.models import CuisineCategory
        for cat in CUISINE_CATEGORIES:
            obj, created = CuisineCategory.objects.update_or_create(
                name=cat["name"], defaults=cat
            )
            label = "created" if created else "updated"
            self.stdout.write(f"  {label}: {obj.icon} {obj.name}")

    def _seed_hotel(self):
        from django.contrib.auth import get_user_model
        from apps.restaurants.models import Restaurant, MenuCategory, MenuItem
        from apps.ai_templates.models import AITemplate
        from django.utils.text import slugify

        User = get_user_model()

        owner, created = User.objects.update_or_create(
            email="admin@muruganidli.com",
            defaults={
                "name":                "Murugan Swaminathan",
                "phone":               "9876543210",
                "role":                "hotel_admin",
                "is_profile_complete": True,
                "is_active":           True,
            },
        )
        owner.set_password("demo1234")
        owner.save(update_fields=["password"])
        self.stdout.write(f"  {'created' if created else 'updated'}: hotel owner {owner.email}")

        restaurant, _ = Restaurant.objects.update_or_create(
            owner=owner,
            defaults={
                "name":              "Murugan Idli Shop",
                "slug":              slugify("Murugan Idli Shop"),
                "description":       "Iconic Coimbatore tiffin house famous for soft idlis and filter coffee since 1948.",
                "cuisine_tags":      ["South Indian", "Tiffin", "Vegetarian"],
                "thumbnail":         "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600",
                "cover_image":       "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200",
                "address":           "No. 77, Bharathiar Road, RS Puram",
                "city":              "Coimbatore",
                "area":              "RS Puram",
                "state":             "Tamil Nadu",
                "pincode":           "641002",
                "phone":             "+91 422 234 5678",
                "timings":           "06:00 AM - 10:00 PM",
                "fssai":             "12419992000123",
                "is_open":           True,
                "is_featured":       True,
                "is_active":         True,
                "min_order":         100,
                "delivery_fee":      30,
                "avg_delivery_time": 25,
                "rating_avg":        4.7,
                "rating_count":      2847,
                "discount_type":     "percentage",
                "discount_value":    20,
                "discount_label":    "20% OFF upto ₹100",
            },
        )
        self.stdout.write(f"  seeded: restaurant {restaurant.name}")

        # Menu
        cat1, _ = MenuCategory.objects.get_or_create(restaurant=restaurant, name="Idli & Dosa", defaults={"icon": "🥞", "order": 1})
        cat2, _ = MenuCategory.objects.get_or_create(restaurant=restaurant, name="Rice & Curries", defaults={"icon": "🍛", "order": 2})
        cat3, _ = MenuCategory.objects.get_or_create(restaurant=restaurant, name="Beverages", defaults={"icon": "☕", "order": 3})

        items = [
            (cat1, "Soft Idli (2 pieces)", "Classic steamed rice cakes served with sambar and three chutneys", 45, True, True, True),
            (cat1, "Ghee Roast Dosa",      "Crispy dosa drizzled with generous ghee",                          75, True, True, True),
            (cat1, "Masala Dosa",          "Dosa stuffed with spiced potato filling",                          70, True, False, True),
            (cat1, "Rava Dosa",            "Crispy semolina dosa with onions",                                  65, True, False, False),
            (cat2, "Mini Meals (Veg)",     "Full South Indian meal with rice, sambar, rasam, 4 curries",       130, True, True, True),
            (cat2, "Sambar Rice",          "Comfort rice cooked with dal and vegetables",                       90, True, False, True),
            (cat3, "Filter Coffee",        "Traditional decoction-based South Indian coffee",                   35, True, True, True),
            (cat3, "Masala Chai",          "Spiced ginger tea with cardamom and tulsi",                         25, True, False, True),
        ]
        for cat, name, desc, price, is_veg, bestseller, available in items:
            MenuItem.objects.get_or_create(
                category=cat, name=name,
                defaults={"description": desc, "price": price, "is_veg": is_veg,
                          "is_bestseller": bestseller, "is_available": available}
            )
        self.stdout.write(f"  seeded: {len(items)} menu items")

        # AI Template
        AITemplate.objects.get_or_create(
            restaurant=restaurant,
            name="Warm & Grateful",
            defaults={
                "description":          "Warm, heritage-focused gratitude responses",
                "tone":                 "warm",
                "prompt_instructions":  "Respond with genuine warmth. Mention our 75+ year heritage. Reference specific dishes or aspects in the review. Express sincere gratitude. End with a heartfelt invitation to return. Use one food emoji.",
                "is_active":            True,
            },
        )
        self.stdout.write("  seeded: AI template")

    def _seed_customer(self):
        from django.contrib.auth import get_user_model
        from apps.accounts.models import Address

        User = get_user_model()
        customer, created = User.objects.update_or_create(
            email="arjun.kumar@gmail.com",
            defaults={
                "name":                "Arjun Kumar",
                "phone":               "9876543210",
                "role":                "customer",
                "is_profile_complete": True,
                "is_active":           True,
                "avatar":              "https://api.dicebear.com/7.x/avataaars/svg?seed=arjun",
            },
        )
        customer.set_password("demo1234")
        customer.save(update_fields=["password"])

        Address.objects.get_or_create(
            user=customer, label="Home",
            defaults={
                "line1":      "42, Sai Nagar",
                "line2":      "Near Ganesh Temple",
                "city":       "Coimbatore",
                "state":      "Tamil Nadu",
                "pincode":    "641011",
                "is_default": True,
            },
        )
        self.stdout.write(f"  {'created' if created else 'updated'}: customer {customer.email}")
