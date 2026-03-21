"""apps/restaurants/serializers.py"""
from rest_framework import serializers
from .models import Restaurant, MenuCategory, MenuItem, CuisineCategory, Coupon


class CuisineCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = CuisineCategory
        fields = ["id", "name", "icon", "color"]


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MenuItem
        fields = [
            "id", "name", "description", "price", "original_price",
            "image", "is_veg", "is_bestseller", "is_available",
            "spice_level", "customizations",
        ]


class MenuCategorySerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model  = MenuCategory
        fields = ["id", "name", "icon", "items"]


class RestaurantListSerializer(serializers.ModelSerializer):
    rating       = serializers.DecimalField(source="rating_avg", max_digits=3, decimal_places=1)
    total_reviews = serializers.IntegerField(source="rating_count")
    discount     = serializers.SerializerMethodField()
    location     = serializers.SerializerMethodField()

    class Meta:
        model  = Restaurant
        fields = [
            "id", "name", "slug", "description", "cuisine_tags",
            "thumbnail", "cover_image", "rating", "total_reviews",
            "avg_delivery_time", "min_order", "delivery_fee",
            "is_open", "is_featured", "discount", "location",
        ]

    def get_discount(self, obj):
        return obj.discount

    def get_location(self, obj):
        return {"city": obj.city, "area": obj.area}


class RestaurantDetailSerializer(RestaurantListSerializer):
    menu_categories = MenuCategorySerializer(many=True, read_only=True)

    class Meta(RestaurantListSerializer.Meta):
        fields = RestaurantListSerializer.Meta.fields + [
            "address", "phone", "timings", "fssai", "menu_categories"
        ]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Coupon
        fields = ["code", "description", "coupon_type", "value", "max_discount", "min_order", "expires_at"]


# ── Hotel-side Menu Serializers ────────────────────────────────────────────────

class MenuItemUpdateSerializer(serializers.ModelSerializer):
    """For hotel admins to update menu items."""
    class Meta:
        model  = MenuItem
        fields = [
            "name", "description", "price", "original_price",
            "image", "is_veg", "is_bestseller", "is_available",
            "spice_level", "customizations", "order",
        ]
