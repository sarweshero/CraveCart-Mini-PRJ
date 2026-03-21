"""apps/reviews/serializers.py"""
from rest_framework import serializers
from .models import Review, AIResponse


class AIResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AIResponse
        fields = ["id", "text", "generated_at", "email_sent", "generation_status"]


class ReviewSerializer(serializers.ModelSerializer):
    ai_response = AIResponseSerializer(read_only=True)

    class Meta:
        model  = Review
        fields = ["id", "rating", "comment", "created_at", "ai_response"]


class ReviewCreateSerializer(serializers.Serializer):
    order_id = serializers.CharField()
    rating   = serializers.IntegerField(min_value=1, max_value=5)
    comment  = serializers.CharField(min_length=10, max_length=2000)

    def validate_order_id(self, value):
        from apps.orders.models import Order
        user = self.context["request"].user
        try:
            order = Order.objects.get(pk=value, customer=user, status=Order.Status.DELIVERED)
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order not found or not eligible for review.")
        if hasattr(order, "review"):
            raise serializers.ValidationError("You have already reviewed this order.")
        return value

    def create(self, validated_data):
        from apps.orders.models import Order
        order = Order.objects.select_related("restaurant").get(pk=validated_data["order_id"])
        return Review.objects.create(
            order      = order,
            customer   = self.context["request"].user,
            restaurant = order.restaurant,
            rating     = validated_data["rating"],
            comment    = validated_data["comment"],
        )
