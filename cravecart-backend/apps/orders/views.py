"""apps/orders/views.py"""
from rest_framework import status as drf_status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import F
from .models import Cart, CartItem, Order
from .serializers import CartSerializer, OrderListSerializer, OrderDetailSerializer, PlaceOrderSerializer
from apps.restaurants.models import MenuItem, Coupon
from utils.permissions import IsHotelAdmin, IsCustomer
from utils.pagination import StandardPagination


class CartView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response(CartSerializer(cart).data)


class CartAddItemView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def post(self, request):
        menu_item_id   = request.data.get("menu_item_id")
        quantity       = int(request.data.get("quantity", 1))
        customizations = request.data.get("customizations", [])
        try:
            menu_item = MenuItem.objects.select_related("category__restaurant").get(pk=menu_item_id, is_available=True)
        except MenuItem.DoesNotExist:
            return Response({"message":"Item not available."}, status=400)
        restaurant = menu_item.category.restaurant
        cart, _ = Cart.objects.get_or_create(user=request.user)
        if cart.restaurant and cart.restaurant != restaurant:
            return Response({"message":"Cart contains items from another restaurant.","conflict":True,"cart_restaurant":{"id":cart.restaurant.id,"name":cart.restaurant.name}}, status=409)
        if not cart.restaurant:
            cart.restaurant = restaurant
            cart.save(update_fields=["restaurant"])
        ci, created = CartItem.objects.get_or_create(cart=cart, menu_item=menu_item, defaults={"quantity":quantity,"customizations":customizations})
        if not created:
            ci.quantity += quantity
            ci.save(update_fields=["quantity"])
        return Response({"message":"Item added to cart.","cart_item_id":ci.id}, status=201)


class CartUpdateItemView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def patch(self, request, pk):
        ci = get_object_or_404(CartItem, pk=pk, cart__user=request.user)
        qty = int(request.data.get("quantity",1))
        if qty <= 0:
            ci.delete()
            return Response({"message":"Item removed."})
        ci.quantity = qty
        ci.save(update_fields=["quantity"])
        return Response({"message":"Cart updated."})
    def delete(self, request, pk):
        get_object_or_404(CartItem, pk=pk, cart__user=request.user).delete()
        return Response(status=204)


class CartApplyCouponView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def post(self, request):
        code = request.data.get("code","").upper().strip()
        try:
            coupon = Coupon.objects.get(code=code, is_active=True, expires_at__gt=timezone.now())
        except Coupon.DoesNotExist:
            return Response({"message":"Invalid or expired coupon code."}, status=400)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        if cart.subtotal < coupon.min_order:
            return Response({"message":f"Minimum order amount Rs.{coupon.min_order} required."}, status=400)
        cart.coupon = coupon
        cart.save(update_fields=["coupon"])
        return Response({"message":"Coupon applied successfully.","discount":float(coupon.calculate_discount(cart.subtotal))})


class CartRemoveCouponView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def post(self, request):
        try:
            c = request.user.cart
            c.coupon = None
            c.save(update_fields=["coupon"])
        except Exception:
            pass
        return Response({"message":"Coupon removed."})


class CartClearView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def post(self, request):
        try:
            request.user.cart.clear()
        except Exception:
            pass
        return Response({"message":"Cart cleared."})


class OrderListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def get(self, request):
        orders = Order.objects.filter(customer=request.user).order_by("-placed_at")
        p = StandardPagination()
        page = p.paginate_queryset(orders, request)
        return p.get_paginated_response(OrderListSerializer(page, many=True).data)
    def post(self, request):
        s = PlaceOrderSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        cart = s.validated_data["cart"]
        from apps.accounts.models import Address
        address = get_object_or_404(Address, pk=s.validated_data["delivery_address_id"], user=request.user)

        with transaction.atomic():
            cart = Cart.objects.select_for_update().select_related("coupon", "restaurant").get(pk=cart.pk)
            if not cart.items.exists():
                return Response({"message": "Cart is empty."}, status=400)

            # Recompute a consistent snapshot under lock to avoid stale totals from concurrent cart updates.
            cart_items = list(cart.items.select_related("menu_item").all())
            items_snapshot = [{
                "name": ci.menu_item.name,
                "quantity": ci.quantity,
                "price": float(ci.menu_item.price),
                "customizations": ci.customizations,
                "item_total": float(ci.item_total),
            } for ci in cart_items]

            applied_coupon = cart.coupon
            if applied_coupon:
                coupon = Coupon.objects.select_for_update().get(pk=applied_coupon.pk)
                if (not coupon.is_active) or (coupon.expires_at <= timezone.now()):
                    return Response({"message": "Applied coupon is no longer valid."}, status=400)
                if coupon.max_uses is not None and coupon.used_count >= coupon.max_uses:
                    return Response({"message": "Coupon usage limit has been reached."}, status=400)
                if cart.subtotal < coupon.min_order:
                    return Response({"message": f"Minimum order amount Rs.{coupon.min_order} required."}, status=400)

            order = Order.objects.create(
                customer=request.user, restaurant=cart.restaurant, delivery_address=address,
                items=items_snapshot, subtotal=cart.subtotal, delivery_fee=cart.delivery_fee,
                platform_fee=cart.platform_fee, discount=cart.discount, taxes=cart.taxes, total=cart.total,
                coupon_code=cart.coupon.code if cart.coupon else "",
                payment_method=s.validated_data["payment_method"],
                payment_status=Order.PaymentStatus.PENDING,
                instructions=s.validated_data.get("instructions", ""),
            )

            if cart.coupon:
                Coupon.objects.filter(pk=cart.coupon.pk).update(used_count=F("used_count") + 1)

            cart.clear()

        from apps.notifications.tasks import send_new_order_notification
        send_new_order_notification.delay(order.id)
        return Response({
            "id": order.id,
            "status": order.status,
            "total": float(order.total),
            "estimated_delivery_time": cart.restaurant.avg_delivery_time,
            "message": "Order placed successfully!",
        }, status=201)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk, customer=request.user)
        return Response(OrderDetailSerializer(order).data)


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, customer=request.user)
        if order.status not in [Order.Status.PLACED, Order.Status.CONFIRMED]:
            return Response({"message":"Order cannot be cancelled at this stage."}, status=400)
        order.status = Order.Status.CANCELLED
        order.cancelled_at = timezone.now()
        order.cancellation_reason = request.data.get("reason","Cancelled by customer")
        order.save(update_fields=["status","cancelled_at","cancellation_reason"])
        return Response({"message":"Order cancelled successfully."})


class HotelOrderListView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def get(self, request):
        restaurant = request.user.restaurant
        qs = Order.objects.filter(restaurant=restaurant).order_by("-placed_at")
        sf = request.query_params.get("status")
        if sf and sf != "all":
            qs = qs.filter(status=sf)
        p = StandardPagination()
        page = p.paginate_queryset(qs, request)
        data = [{"id":o.id,"customer":{"name":o.customer.name,"phone":o.customer.phone,"avatar":o.customer.avatar},"items":o.items,"subtotal":float(o.subtotal),"total":float(o.total),"status":o.status,"placed_at":o.placed_at.isoformat(),"delivery_address":f"{o.delivery_address.line1}, {o.delivery_address.city} - {o.delivery_address.pincode}" if o.delivery_address else ""} for o in page]
        return p.get_paginated_response(data)


class HotelOrderStatusView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk, restaurant=request.user.restaurant)
        new_status = request.data.get("status")
        valid = {Order.Status.PLACED:Order.Status.CONFIRMED,Order.Status.CONFIRMED:Order.Status.PREPARING,Order.Status.PREPARING:Order.Status.OUT_FOR_DELIVERY,Order.Status.OUT_FOR_DELIVERY:Order.Status.DELIVERED}
        if new_status:
            if order.status in valid and valid[order.status]==new_status:
                order.advance_status()
            elif new_status==Order.Status.CANCELLED:
                order.status=Order.Status.CANCELLED; order.cancelled_at=timezone.now()
                order.save(update_fields=["status","cancelled_at"])
            else:
                return Response({"message":"Invalid status transition."}, status=400)
        else:
            order.advance_status()
        from apps.notifications.tasks import send_order_status_update
        send_order_status_update.delay(order.id)
        return Response({"message":f"Order status updated to {order.status}","status":order.status})
