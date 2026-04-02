"""apps/delivery/serializers.py"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import DeliveryPartner, DeliveryAssignment, EarningsSummary
from utils.media import delete_storage_file_if_managed, ensure_public_media_url

User = get_user_model()


class DeliveryRegisterSerializer(serializers.Serializer):
    email          = serializers.EmailField()
    password       = serializers.CharField(min_length=8, write_only=True)
    name           = serializers.CharField(max_length=150)
    phone          = serializers.CharField(max_length=20)
    city           = serializers.CharField(max_length=100)
    vehicle_type   = serializers.ChoiceField(choices=DeliveryPartner.VehicleType.choices)
    vehicle_number = serializers.CharField(max_length=20)
    aadhar_number  = serializers.CharField(max_length=12)

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate_aadhar_number(self, value):
        if not value.isdigit() or len(value) != 12:
            raise serializers.ValidationError("Aadhar must be a 12-digit number.")
        return value

    def create(self, validated_data):
        partner_fields = {k: validated_data.pop(k) for k in
                         ["phone", "city", "vehicle_type", "vehicle_number", "aadhar_number"]}
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            name=validated_data["name"],
            role="delivery_partner",
            is_profile_complete=True,
        )
        DeliveryPartner.objects.create(user=user, **partner_fields)
        return user


class DeliveryPartnerProfileSerializer(serializers.ModelSerializer):
    name  = serializers.CharField(source="user.name", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = DeliveryPartner
        fields = [
            "id", "name", "email", "phone", "avatar", "city",
            "vehicle_type", "vehicle_number", "is_verified", "is_online",
            "total_deliveries", "total_earnings", "rating_avg", "rating_count",
            "today_deliveries", "today_earnings", "acceptance_rate", "joined_at",
        ]
        read_only_fields = [
            "id", "name", "email", "is_verified", "total_deliveries",
            "total_earnings", "rating_avg", "rating_count",
            "today_deliveries", "today_earnings", "joined_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["avatar"] = ensure_public_media_url(data.get("avatar", ""))
        return data

    def update(self, instance, validated_data):
        old_avatar = instance.avatar
        instance = super().update(instance, validated_data)

        new_avatar = instance.avatar
        if "avatar" in validated_data and old_avatar and old_avatar != new_avatar:
            delete_storage_file_if_managed(old_avatar)

        return instance


class AssignmentOrderSerializer(serializers.Serializer):
    id                 = serializers.CharField()
    restaurant_name    = serializers.SerializerMethodField()
    restaurant_address = serializers.SerializerMethodField()
    customer_name      = serializers.SerializerMethodField()
    delivery_address   = serializers.SerializerMethodField()
    items_count        = serializers.IntegerField()
    total              = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method     = serializers.CharField()
    instructions       = serializers.CharField()

    def get_restaurant_name(self, obj):
        return obj.restaurant.name if obj.restaurant else ""

    def get_restaurant_address(self, obj):
        if obj.restaurant:
            return f"{obj.restaurant.area}, {obj.restaurant.city}".strip(", ")
        return ""

    def get_customer_name(self, obj):
        return obj.customer.name or obj.customer.email.split("@")[0]

    def get_delivery_address(self, obj):
        if obj.delivery_address:
            a = obj.delivery_address
            return f"{a.line1}, {a.city} - {a.pincode}"
        return ""


class AssignmentSerializer(serializers.ModelSerializer):
    order = AssignmentOrderSerializer(read_only=True)

    class Meta:
        model = DeliveryAssignment
        fields = [
            "id", "order", "status", "base_earning", "distance_km",
            "bonus", "total_earning", "assigned_at", "accepted_at",
            "picked_up_at", "delivered_at", "expires_at",
            "customer_rating", "customer_tip",
        ]
        read_only_fields = ["id", "order", "base_earning", "total_earning", "assigned_at", "expires_at"]


class EarningsSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = EarningsSummary
        fields = ["date", "deliveries", "earnings", "online_hours", "avg_rating"]
