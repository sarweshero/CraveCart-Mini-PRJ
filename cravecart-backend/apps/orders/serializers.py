"""apps/orders/serializers.py"""
from rest_framework import serializers
from apps.accounts.serializers import AddressSerializer
from .models import Cart, CartItem, Order


class CartItemSerializer(serializers.ModelSerializer):
    menu_item  = serializers.SerializerMethodField()
    item_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    class Meta:
        model  = CartItem
        fields = ["id","menu_item","quantity","customizations","item_total"]
    def get_menu_item(self, obj):
        i = obj.menu_item
        return {"id":i.id,"name":i.name,"price":float(i.price),"image":i.image}


class CartSerializer(serializers.ModelSerializer):
    items          = CartItemSerializer(many=True, read_only=True)
    restaurant     = serializers.SerializerMethodField()
    subtotal       = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    delivery_fee   = serializers.DecimalField(max_digits=6,  decimal_places=2, read_only=True)
    platform_fee   = serializers.DecimalField(max_digits=6,  decimal_places=2, read_only=True)
    discount       = serializers.DecimalField(max_digits=8,  decimal_places=2, read_only=True)
    taxes          = serializers.DecimalField(max_digits=8,  decimal_places=2, read_only=True)
    total          = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    applied_coupon = serializers.SerializerMethodField()
    class Meta:
        model  = Cart
        fields = ["id","restaurant","items","subtotal","delivery_fee","platform_fee","discount","taxes","total","applied_coupon"]
    def get_restaurant(self, obj):
        return {"id":obj.restaurant.id,"name":obj.restaurant.name} if obj.restaurant else None
    def get_applied_coupon(self, obj):
        if not obj.coupon: return None
        return {"code":obj.coupon.code,"type":obj.coupon.coupon_type,"value":float(obj.coupon.value),"max_discount":float(obj.coupon.max_discount) if obj.coupon.max_discount else None}


class OrderListSerializer(serializers.ModelSerializer):
    restaurant = serializers.SerializerMethodField()
    has_review = serializers.BooleanField(read_only=True)
    class Meta:
        model  = Order
        fields = ["id","restaurant","status","items_count","total","placed_at","delivered_at","has_review"]
    def get_restaurant(self, obj):
        return {"id":obj.restaurant.id,"name":obj.restaurant.name,"thumbnail":obj.restaurant.thumbnail}


class OrderDetailSerializer(serializers.ModelSerializer):
    restaurant       = serializers.SerializerMethodField()
    tracking         = serializers.ListField(read_only=True)
    delivery_address = AddressSerializer(read_only=True)
    review           = serializers.SerializerMethodField()
    class Meta:
        model  = Order
        fields = ["id","restaurant","status","tracking","items","delivery_address","subtotal","delivery_fee","platform_fee","discount","taxes","total","coupon_code","payment_method","payment_status","placed_at","delivered_at","instructions","review"]
    def get_restaurant(self, obj):
        r = obj.restaurant
        return {"id":r.id,"name":r.name,"thumbnail":r.thumbnail,"phone":r.phone,"address":r.address}
    def get_review(self, obj):
        from apps.reviews.serializers import ReviewSerializer
        try:
            return ReviewSerializer(obj.review).data
        except Exception:
            return None


class PlaceOrderSerializer(serializers.Serializer):
    delivery_address_id = serializers.IntegerField()
    payment_method      = serializers.ChoiceField(choices=Order.PaymentMethod.choices)
    instructions        = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_delivery_address_id(self, value):
        from apps.accounts.models import Address
        try:
            Address.objects.get(pk=value, user=self.context["request"].user)
        except Address.DoesNotExist:
            raise serializers.ValidationError("Address not found.")
        return value

    def validate(self, data):
        user = self.context["request"].user
        try:
            cart = user.cart
        except Exception:
            raise serializers.ValidationError("Your cart is empty.")
        if not cart.items.exists():
            raise serializers.ValidationError("Your cart is empty.")
        if not cart.restaurant:
            raise serializers.ValidationError("Cart has no restaurant.")
        from django.conf import settings
        min_o = getattr(settings,"MIN_ORDER_AMOUNT",50)
        if cart.subtotal < min_o:
            raise serializers.ValidationError(f"Minimum order amount is Rs.{min_o}.")
        data["cart"] = cart
        return data
