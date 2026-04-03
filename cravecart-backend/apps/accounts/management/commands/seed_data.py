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
from urllib.parse import quote_plus

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


def _seed_image_url(query, size="900x700"):
    return f"https://source.unsplash.com/{size}/?{quote_plus(query)}"

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

EXTRA_HOTEL_SPECS = [
    {
        "key": "chettinad_flame",
        "owner": {"email": "admin@chettinadflame.com", "name": "Selvi Rajendran", "phone": "9840011101"},
        "restaurant": {
            "name": "Chettinad Flame",
            "description": "Bold Chettinad spices, pepper roasts, and house-ground masalas.",
            "cuisine_tags": ["South Indian", "Chettinad", "Spicy"],
            "address": "11, DB Road, Saibaba Colony",
            "city": "Coimbatore",
            "area": "Saibaba Colony",
            "state": "Tamil Nadu",
            "pincode": "641038",
            "phone": "+91 422 301 1101",
            "timings": "11:30 AM - 11:00 PM",
            "fssai": "12423011000101",
            "min_order": 180,
            "delivery_fee": 35,
            "avg_delivery_time": 34,
            "rating_avg": 4.6,
            "rating_count": 1220,
            "discount_type": "percentage",
            "discount_value": 18,
            "discount_label": "18% OFF on classics",
        },
        "menu_name": "Chettinad Classics",
        "menu_icon": "🍲",
        "items": [
            {"name": "Pepper Chicken Fry", "description": "Dry roast chicken with black pepper and curry leaves", "price": 260, "is_veg": False, "spice_level": "hot"},
            {"name": "Kozhi Curry Meal", "description": "Steamed rice with homestyle chicken curry", "price": 230, "is_veg": False, "spice_level": "medium"},
            {"name": "Veg Korma Parotta", "description": "Layered parotta served with vegetable korma", "price": 160, "is_veg": True, "spice_level": "medium"},
            {"name": "Kari Dosa", "description": "Ghee dosa topped with spicy minced mutton masala", "price": 240, "is_veg": False, "spice_level": "hot"},
            {"name": "Elaneer Payasam", "description": "Tender coconut milk dessert chilled and creamy", "price": 110, "is_veg": True},
        ],
        "ai_template": {
            "name": "Spice Notes",
            "description": "Warm and descriptive replies focused on spice balance",
            "tone": "warm",
            "prompt_instructions": "Acknowledge flavor feedback with warmth. Mention one spice or preparation detail and invite the customer to try another house special.",
        },
    },
    {
        "key": "wok_story",
        "owner": {"email": "admin@wokstoryexpress.com", "name": "Liang Prakash", "phone": "9840011102"},
        "restaurant": {
            "name": "Wok Story Express",
            "description": "Fast wok-tossed noodles, gravies, and Indo-Chinese bowls.",
            "cuisine_tags": ["Chinese", "Asian", "Noodles"],
            "address": "45, Cross Cut Road, Gandhipuram",
            "city": "Coimbatore",
            "area": "Gandhipuram",
            "state": "Tamil Nadu",
            "pincode": "641012",
            "phone": "+91 422 301 1102",
            "timings": "12:00 PM - 11:30 PM",
            "fssai": "12423011000102",
            "min_order": 170,
            "delivery_fee": 35,
            "avg_delivery_time": 30,
            "rating_avg": 4.4,
            "rating_count": 980,
            "discount_type": "flat",
            "discount_value": 60,
            "discount_label": "Flat ₹60 OFF",
        },
        "menu_name": "Wok Specials",
        "menu_icon": "🥡",
        "items": [
            {"name": "Hakka Noodles", "description": "Stir-fried noodles with crunchy vegetables", "price": 170, "is_veg": True, "spice_level": "medium"},
            {"name": "Chilli Chicken", "description": "Crispy chicken tossed in chilli garlic sauce", "price": 240, "is_veg": False, "spice_level": "hot"},
            {"name": "Schezwan Fried Rice", "description": "Spicy schezwan rice with spring onions", "price": 190, "is_veg": True, "spice_level": "hot"},
            {"name": "Veg Manchurian Gravy", "description": "Veg dumplings in tangy soy garlic gravy", "price": 180, "is_veg": True, "spice_level": "medium"},
            {"name": "Honey Chilli Potato", "description": "Crispy potatoes glazed with sweet chilli", "price": 160, "is_veg": True},
        ],
        "ai_template": {
            "name": "Quick Service Tone",
            "description": "Energetic and concise response style",
            "tone": "friendly",
            "prompt_instructions": "Thank them quickly, reference one texture or flavor, and close with a one-line recommendation.",
        },
    },
    {
        "key": "burger_barn",
        "owner": {"email": "admin@burgerbarngrill.com", "name": "Nikhil Arora", "phone": "9840011103"},
        "restaurant": {
            "name": "Burger Barn & Grill",
            "description": "Stacked burgers, loaded fries, and grilled comfort meals.",
            "cuisine_tags": ["Burgers", "Fast Food", "Grill"],
            "address": "22, Race Course Road, Gopalapuram",
            "city": "Coimbatore",
            "area": "Race Course",
            "state": "Tamil Nadu",
            "pincode": "641018",
            "phone": "+91 422 301 1103",
            "timings": "12:00 PM - 12:00 AM",
            "fssai": "12423011000103",
            "min_order": 220,
            "delivery_fee": 45,
            "avg_delivery_time": 29,
            "rating_avg": 4.3,
            "rating_count": 1650,
            "discount_type": "percentage",
            "discount_value": 20,
            "discount_label": "20% OFF burgers",
        },
        "menu_name": "Barn Favorites",
        "menu_icon": "🍔",
        "items": [
            {"name": "Smoky Chicken Burger", "description": "Grilled chicken patty with smoky mayo", "price": 260, "is_veg": False},
            {"name": "Crispy Veggie Burger", "description": "Crunchy vegetable patty with house sauce", "price": 220, "is_veg": True},
            {"name": "BBQ Paneer Melt", "description": "Paneer patty topped with barbecue glaze", "price": 240, "is_veg": True, "spice_level": "medium"},
            {"name": "Loaded Cheese Fries", "description": "Fries loaded with cheese sauce and herbs", "price": 170, "is_veg": True},
            {"name": "Peri Peri Chicken Wings", "description": "Juicy wings tossed in peri peri rub", "price": 280, "is_veg": False, "spice_level": "hot"},
        ],
        "ai_template": {
            "name": "Bold Grill Voice",
            "description": "Confident and upbeat response style",
            "tone": "friendly",
            "prompt_instructions": "Keep it bold and fun, thank the customer, and suggest one combo add-on for next order.",
        },
    },
    {
        "key": "tandoori_nights",
        "owner": {"email": "admin@tandoorinights.co", "name": "Imran Nawaz", "phone": "9840011104"},
        "restaurant": {
            "name": "Tandoori Nights",
            "description": "North Indian kebabs, curries, and smoky tandoor breads.",
            "cuisine_tags": ["North Indian", "Kebabs", "Tandoor"],
            "address": "7, Lakshmi Mills Junction, Avinashi Road",
            "city": "Coimbatore",
            "area": "Lakshmi Mills",
            "state": "Tamil Nadu",
            "pincode": "641037",
            "phone": "+91 422 301 1104",
            "timings": "11:30 AM - 11:45 PM",
            "fssai": "12423011000104",
            "min_order": 210,
            "delivery_fee": 40,
            "avg_delivery_time": 36,
            "rating_avg": 4.5,
            "rating_count": 1430,
            "discount_type": "flat",
            "discount_value": 80,
            "discount_label": "Flat ₹80 OFF",
        },
        "menu_name": "Tandoor & Curry",
        "menu_icon": "🔥",
        "items": [
            {"name": "Chicken Tikka", "description": "Char-grilled chicken tikka with mint dip", "price": 290, "is_veg": False, "spice_level": "medium"},
            {"name": "Paneer Butter Masala", "description": "Paneer cubes in creamy tomato gravy", "price": 240, "is_veg": True, "spice_level": "mild"},
            {"name": "Butter Chicken", "description": "Tender chicken in rich buttery makhani gravy", "price": 300, "is_veg": False, "spice_level": "medium"},
            {"name": "Garlic Naan", "description": "Tandoor naan topped with garlic butter", "price": 60, "is_veg": True},
            {"name": "Jeera Rice", "description": "Aromatic basmati rice tempered with cumin", "price": 140, "is_veg": True},
        ],
        "ai_template": {
            "name": "Classic Courtesy",
            "description": "Polished and respectful review responses",
            "tone": "professional",
            "prompt_instructions": "Acknowledge the meal experience courteously and recommend one tandoor plus curry pairing.",
        },
    },
    {
        "key": "ramen_republic",
        "owner": {"email": "admin@ramenrepublic.in", "name": "Aiko Raman", "phone": "9840011105"},
        "restaurant": {
            "name": "Ramen Republic",
            "description": "Asian broth bowls, bao bites, and slurp-worthy noodles.",
            "cuisine_tags": ["Japanese", "Ramen", "Asian"],
            "address": "66, Hopes College Road, Peelamedu",
            "city": "Coimbatore",
            "area": "Peelamedu",
            "state": "Tamil Nadu",
            "pincode": "641004",
            "phone": "+91 422 301 1105",
            "timings": "12:00 PM - 11:00 PM",
            "fssai": "12423011000105",
            "min_order": 230,
            "delivery_fee": 45,
            "avg_delivery_time": 33,
            "rating_avg": 4.4,
            "rating_count": 890,
            "discount_type": "percentage",
            "discount_value": 15,
            "discount_label": "15% OFF on bowls",
        },
        "menu_name": "Bowl Kitchen",
        "menu_icon": "🍜",
        "items": [
            {"name": "Chicken Shoyu Ramen", "description": "Soy broth ramen with chicken slices and egg", "price": 320, "is_veg": False, "spice_level": "mild"},
            {"name": "Spicy Miso Ramen", "description": "Miso broth with chilli oil and corn", "price": 300, "is_veg": True, "spice_level": "hot"},
            {"name": "Teriyaki Chicken Don", "description": "Rice bowl topped with teriyaki glazed chicken", "price": 290, "is_veg": False, "spice_level": "medium"},
            {"name": "Veg Gyoza", "description": "Pan-seared dumplings with sesame soy dip", "price": 220, "is_veg": True},
            {"name": "Matcha Cheesecake Cup", "description": "Creamy matcha cheesecake in a dessert cup", "price": 150, "is_veg": True},
        ],
        "ai_template": {
            "name": "Calm Japanese Tone",
            "description": "Measured and thoughtful response style",
            "tone": "professional",
            "prompt_instructions": "Respond calmly, mention broth or texture notes, and thank the guest for detailed feedback.",
        },
    },
    {
        "key": "shawarma_square",
        "owner": {"email": "admin@shawarmasquare.com", "name": "Faizal Kareem", "phone": "9840011106"},
        "restaurant": {
            "name": "Shawarma Square",
            "description": "Middle Eastern wraps, rice platters, and grilled skewers.",
            "cuisine_tags": ["Arabian", "Shawarma", "Grill"],
            "address": "88, Trichy Road, Ramanathapuram",
            "city": "Coimbatore",
            "area": "Ramanathapuram",
            "state": "Tamil Nadu",
            "pincode": "641045",
            "phone": "+91 422 301 1106",
            "timings": "01:00 PM - 12:00 AM",
            "fssai": "12423011000106",
            "min_order": 190,
            "delivery_fee": 38,
            "avg_delivery_time": 31,
            "rating_avg": 4.3,
            "rating_count": 1110,
            "discount_type": "flat",
            "discount_value": 70,
            "discount_label": "Flat ₹70 OFF",
        },
        "menu_name": "Wraps & Platters",
        "menu_icon": "🥙",
        "items": [
            {"name": "Classic Chicken Shawarma", "description": "Roasted chicken wrapped with garlic toum", "price": 180, "is_veg": False},
            {"name": "Falafel Wrap", "description": "Crispy falafel wrap with tahini sauce", "price": 160, "is_veg": True},
            {"name": "Chicken Mandi Rice", "description": "Aromatic mandi rice with grilled chicken", "price": 320, "is_veg": False, "spice_level": "medium"},
            {"name": "Hummus & Pita", "description": "Creamy hummus served with warm pita bread", "price": 170, "is_veg": True},
            {"name": "Harissa Fries", "description": "Crispy fries with spicy harissa mayo", "price": 140, "is_veg": True, "spice_level": "medium"},
        ],
        "ai_template": {
            "name": "Arabian Hospitality",
            "description": "Friendly and welcoming tone",
            "tone": "warm",
            "prompt_instructions": "Thank warmly, mention freshness or grill quality, and invite them to try a platter next.",
        },
    },
    {
        "key": "sweet_cravings",
        "owner": {"email": "admin@sweetcravingsstudio.com", "name": "Meera Dhanush", "phone": "9840011107"},
        "restaurant": {
            "name": "Sweet Cravings Studio",
            "description": "Dessert boxes, waffles, shakes, and baked favorites.",
            "cuisine_tags": ["Desserts", "Bakery", "Beverages"],
            "address": "5, Bharathi Park, Tatabad",
            "city": "Coimbatore",
            "area": "Tatabad",
            "state": "Tamil Nadu",
            "pincode": "641012",
            "phone": "+91 422 301 1107",
            "timings": "10:00 AM - 11:00 PM",
            "fssai": "12423011000107",
            "min_order": 140,
            "delivery_fee": 30,
            "avg_delivery_time": 24,
            "rating_avg": 4.7,
            "rating_count": 2050,
            "discount_type": "percentage",
            "discount_value": 22,
            "discount_label": "22% OFF on desserts",
        },
        "menu_name": "Dessert Bar",
        "menu_icon": "🍰",
        "items": [
            {"name": "Nutella Waffle", "description": "Belgian waffle drizzled with nutella", "price": 190, "is_veg": True},
            {"name": "Lotus Biscoff Cheesecake", "description": "Creamy no-bake cheesecake with biscoff", "price": 210, "is_veg": True},
            {"name": "Brownie Fudge Sundae", "description": "Warm brownie topped with vanilla and fudge", "price": 220, "is_veg": True},
            {"name": "Mango Tres Leches", "description": "Milk-soaked sponge cake with mango cream", "price": 180, "is_veg": True},
            {"name": "Cold Coffee Shake", "description": "Thick cold coffee blended with ice cream", "price": 130, "is_veg": True},
        ],
        "ai_template": {
            "name": "Sweet Delight Tone",
            "description": "Cheerful, thankful dessert-focused replies",
            "tone": "friendly",
            "prompt_instructions": "Use a cheerful tone, thank them, and suggest one dessert pairing or shake recommendation.",
        },
    },
    {
        "key": "street_tadka",
        "owner": {"email": "admin@streettadkajunction.com", "name": "Ravi Solanki", "phone": "9840011108"},
        "restaurant": {
            "name": "Street Tadka Junction",
            "description": "Popular Indian street snacks, chaat, and quick bites.",
            "cuisine_tags": ["Street Food", "Chaat", "Snacks"],
            "address": "39, NSR Road, Saibaba Colony",
            "city": "Coimbatore",
            "area": "Saibaba Colony",
            "state": "Tamil Nadu",
            "pincode": "641011",
            "phone": "+91 422 301 1108",
            "timings": "04:00 PM - 11:30 PM",
            "fssai": "12423011000108",
            "min_order": 120,
            "delivery_fee": 28,
            "avg_delivery_time": 22,
            "rating_avg": 4.2,
            "rating_count": 1750,
            "discount_type": "flat",
            "discount_value": 50,
            "discount_label": "Flat ₹50 OFF",
        },
        "menu_name": "Street Stars",
        "menu_icon": "🌮",
        "items": [
            {"name": "Pani Puri", "description": "Crispy puris with tangy pani and masala", "price": 80, "is_veg": True},
            {"name": "Dahi Papdi Chaat", "description": "Papdi topped with curd, chutneys and sev", "price": 110, "is_veg": True},
            {"name": "Pav Bhaji", "description": "Buttery pav served with spicy mashed bhaji", "price": 130, "is_veg": True, "spice_level": "medium"},
            {"name": "Vada Pav", "description": "Mumbai-style potato fritter burger", "price": 70, "is_veg": True},
            {"name": "Masala Corn Cup", "description": "Steamed sweet corn with masala and butter", "price": 90, "is_veg": True},
        ],
        "ai_template": {
            "name": "Street Friendly",
            "description": "Casual and upbeat customer acknowledgements",
            "tone": "friendly",
            "prompt_instructions": "Keep it short, energetic and warm. Mention one snack highlight and invite them back.",
        },
    },
    {
        "key": "kerala_boat_house",
        "owner": {"email": "admin@keralaboathouse.in", "name": "Anu Nair", "phone": "9840011109"},
        "restaurant": {
            "name": "Kerala Boat House",
            "description": "Kerala style curries, appams, and coconut-rich coastal dishes.",
            "cuisine_tags": ["Kerala", "Seafood", "South Indian"],
            "address": "17, Sungam Bypass Road, Ukkadam",
            "city": "Coimbatore",
            "area": "Ukkadam",
            "state": "Tamil Nadu",
            "pincode": "641001",
            "phone": "+91 422 301 1109",
            "timings": "12:00 PM - 10:30 PM",
            "fssai": "12423011000109",
            "min_order": 200,
            "delivery_fee": 42,
            "avg_delivery_time": 35,
            "rating_avg": 4.5,
            "rating_count": 1188,
            "discount_type": "percentage",
            "discount_value": 16,
            "discount_label": "16% OFF coastal menu",
        },
        "menu_name": "Kerala Kitchen",
        "menu_icon": "🍛",
        "items": [
            {"name": "Malabar Chicken Curry", "description": "Coconut-rich chicken curry with roasted spices", "price": 260, "is_veg": False, "spice_level": "medium"},
            {"name": "Appam (3 pcs)", "description": "Soft lacy appams made with fermented batter", "price": 95, "is_veg": True},
            {"name": "Fish Pollichathu", "description": "Banana leaf grilled fish with kerala masala", "price": 320, "is_veg": False, "spice_level": "hot"},
            {"name": "Avial", "description": "Mixed vegetables in coconut and curd", "price": 170, "is_veg": True, "spice_level": "mild"},
            {"name": "Parotta with Egg Roast", "description": "Flaky parotta served with spicy egg roast", "price": 180, "is_veg": False, "spice_level": "medium"},
        ],
        "ai_template": {
            "name": "Coastal Warmth",
            "description": "Warm and homely response style",
            "tone": "warm",
            "prompt_instructions": "Thank sincerely, mention authenticity and invite them to try another Kerala favorite.",
        },
    },
    {
        "key": "tex_mex_cantina",
        "owner": {"email": "admin@texmexcantina.in", "name": "Daniel Joseph", "phone": "9840011110"},
        "restaurant": {
            "name": "Tex-Mex Cantina",
            "description": "Burritos, tacos, bowls, and loaded nachos with bold sauces.",
            "cuisine_tags": ["Tex-Mex", "Street Food", "Fast Food"],
            "address": "29, Thudiyalur Main Road, Saravanampatti",
            "city": "Coimbatore",
            "area": "Saravanampatti",
            "state": "Tamil Nadu",
            "pincode": "641035",
            "phone": "+91 422 301 1110",
            "timings": "12:00 PM - 11:30 PM",
            "fssai": "12423011000110",
            "min_order": 210,
            "delivery_fee": 39,
            "avg_delivery_time": 30,
            "rating_avg": 4.3,
            "rating_count": 960,
            "discount_type": "flat",
            "discount_value": 65,
            "discount_label": "Flat ₹65 OFF",
        },
        "menu_name": "Cantina Specials",
        "menu_icon": "🌯",
        "items": [
            {"name": "Chicken Burrito", "description": "Soft tortilla stuffed with rice, beans and chicken", "price": 280, "is_veg": False, "spice_level": "medium"},
            {"name": "Veg Quesadilla", "description": "Cheesy toasted tortilla with mixed peppers", "price": 230, "is_veg": True, "spice_level": "mild"},
            {"name": "Loaded Nachos", "description": "Corn chips with salsa, jalapenos and cheese", "price": 210, "is_veg": True, "spice_level": "medium"},
            {"name": "Chipotle Rice Bowl", "description": "Mexican rice bowl with chipotle dressing", "price": 250, "is_veg": True, "spice_level": "medium"},
            {"name": "Beef Taco Trio", "description": "Three soft tacos with spiced beef filling", "price": 320, "is_veg": False, "spice_level": "hot"},
        ],
        "ai_template": {
            "name": "Cantina Cheer",
            "description": "Playful, upbeat acknowledgment style",
            "tone": "friendly",
            "prompt_instructions": "Keep tone lively, thank the guest and suggest one salsa level or pairing for next visit.",
        },
    },
]


EXTRA_HOTEL_SEED_DATA = []
for spec in EXTRA_HOTEL_SPECS:
    restaurant_payload = dict(spec["restaurant"])
    restaurant_payload.update(
        {
            "thumbnail": _seed_image_url(f"{spec['restaurant']['name']} food storefront"),
            "cover_image": _seed_image_url(f"{spec['restaurant']['name']} restaurant interior"),
            "is_open": True,
            "is_featured": False,
            "is_active": True,
        }
    )

    signature_items = []
    quick_items = []
    for item_index, item in enumerate(spec["items"], start=1):
        item_payload = {
            "name": item["name"],
            "description": item["description"],
            "price": item["price"],
            "is_veg": item["is_veg"],
            "is_bestseller": item_index <= 2,
            "is_available": True,
            "spice_level": item.get("spice_level"),
            "image": _seed_image_url(f"{item['name']} plated food"),
        }
        if item_index <= 3:
            signature_items.append(item_payload)
        else:
            quick_items.append(item_payload)

    EXTRA_HOTEL_SEED_DATA.append(
        {
            "key": spec["key"],
            "owner": spec["owner"],
            "restaurant": restaurant_payload,
            "menu": [
                {
                    "name": spec["menu_name"],
                    "icon": spec["menu_icon"],
                    "items": signature_items,
                },
                {
                    "name": "Quick Bites & Add-ons",
                    "icon": "🥗",
                    "items": quick_items,
                },
            ],
            "ai_template": spec["ai_template"],
        }
    )

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

        for hotel in HOTEL_SEED_DATA + EXTRA_HOTEL_SEED_DATA:
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
                        "image": item.get("image") or _seed_image_url(f"{item['name']} food plate"),
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
