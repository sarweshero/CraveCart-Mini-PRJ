"""apps/restaurants/serializers.py"""
from rest_framework import serializers
from .models import Restaurant, MenuCategory, MenuItem, CuisineCategory, Coupon
from utils.media import delete_storage_file_if_managed, ensure_public_media_url


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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["image"] = ensure_public_media_url(data.get("image", ""))
        return data


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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["thumbnail"] = ensure_public_media_url(data.get("thumbnail", ""))
        data["cover_image"] = ensure_public_media_url(data.get("cover_image", ""))
        return data

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


class HotelRestaurantProfileSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source="name", max_length=200, required=False)
    owner_name = serializers.CharField(source="owner.name", max_length=150, required=False, allow_blank=True)
    owner_phone = serializers.CharField(source="owner.phone", max_length=20, required=False, allow_blank=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model = Restaurant
        fields = [
            "id",
            "restaurant_name",
            "owner_name",
            "owner_email",
            "owner_phone",
            "description",
            "phone",
            "timings",
            "thumbnail",
            "cover_image",
            "address",
            "city",
            "area",
            "is_open",
        ]
        read_only_fields = ["id", "owner_email", "city", "area", "is_open"]

    def validate_owner_phone(self, value):
        import re

        cleaned = re.sub(r"\s+", "", value)
        if cleaned and not re.match(r"^[6-9]\d{9}$", cleaned):
            raise serializers.ValidationError("Enter a valid 10-digit Indian mobile number.")
        return cleaned

    def update(self, instance, validated_data):
        old_thumbnail = instance.thumbnail
        old_cover = instance.cover_image
        owner_data = validated_data.pop("owner", {})

        instance = super().update(instance, validated_data)

        if "thumbnail" in validated_data and old_thumbnail and old_thumbnail != instance.thumbnail:
            delete_storage_file_if_managed(old_thumbnail)
        if "cover_image" in validated_data and old_cover and old_cover != instance.cover_image:
            delete_storage_file_if_managed(old_cover)

        if owner_data:
            owner = instance.owner
            changed_fields = []
            if "name" in owner_data:
                owner.name = owner_data["name"]
                changed_fields.append("name")
            if "phone" in owner_data:
                owner.phone = owner_data["phone"]
                changed_fields.append("phone")
            if changed_fields:
                owner.save(update_fields=changed_fields)

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["thumbnail"] = ensure_public_media_url(data.get("thumbnail", ""))
        data["cover_image"] = ensure_public_media_url(data.get("cover_image", ""))
        return data


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

    def update(self, instance, validated_data):
        old_image = instance.image
        instance = super().update(instance, validated_data)

        new_image = instance.image
        if "image" in validated_data and old_image and old_image != new_image:
            delete_storage_file_if_managed(old_image)

        return instance


class MenuItemCreateSerializer(serializers.ModelSerializer):
    """For hotel admins to create menu items under their categories."""
    category_id = serializers.IntegerField(write_only=True, required=False)
    category_name = serializers.CharField(write_only=True, required=False, allow_blank=False, max_length=100)

    class Meta:
        model = MenuItem
        fields = [
            "category_id", "category_name", "name", "description", "price", "original_price",
            "image", "is_veg", "is_bestseller", "is_available",
            "spice_level", "customizations", "order",
        ]

    def validate(self, attrs):
        category_id = attrs.get("category_id")
        category_name = attrs.get("category_name")
        if not category_id and not category_name:
            raise serializers.ValidationError("Provide either category_id or category_name.")
        return attrs

    def validate_category_id(self, value):
        restaurant = self.context["restaurant"]
        if not MenuCategory.objects.filter(pk=value, restaurant=restaurant).exists():
            raise serializers.ValidationError("Invalid category for this restaurant.")
        return value

    def create(self, validated_data):
        restaurant = self.context["restaurant"]
        category_id = validated_data.pop("category_id", None)
        category_name = validated_data.pop("category_name", "")

        if category_id:
            category = MenuCategory.objects.get(pk=category_id)
        else:
            normalized_name = category_name.strip()
            category = MenuCategory.objects.filter(
                restaurant=restaurant,
                name__iexact=normalized_name,
            ).first()
            if not category:
                category = MenuCategory.objects.create(restaurant=restaurant, name=normalized_name)

        validated_data["category"] = category
        return super().create(validated_data)
