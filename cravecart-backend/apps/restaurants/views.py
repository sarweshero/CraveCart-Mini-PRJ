"""apps/restaurants/views.py"""
from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Avg, Count
from django.utils import timezone
from datetime import timedelta

from .models import Restaurant, MenuItem, MenuCategory, CuisineCategory, Coupon
from .serializers import (
    RestaurantListSerializer, RestaurantDetailSerializer,
    MenuItemSerializer, MenuItemUpdateSerializer,
    CuisineCategorySerializer, CouponSerializer,
)
from utils.permissions import IsHotelAdmin


class RestaurantListView(generics.ListAPIView):
    serializer_class   = RestaurantListSerializer
    permission_classes = [AllowAny]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ["name", "area", "city"]
    ordering           = ["-is_featured", "-rating_avg"]

    def get_queryset(self):
        qs = Restaurant.objects.filter(is_active=True)
        p  = self.request.query_params
        if p.get("city"):
            qs = qs.filter(city__icontains=p["city"])
        if p.get("cuisine"):
            qs = qs.filter(cuisine_tags__icontains=p["cuisine"])
        if p.get("is_open") in ("true","1"):
            qs = qs.filter(is_open=True)
        sort_map = {"rating":"-rating_avg","delivery_time":"avg_delivery_time","min_order":"min_order","popularity":"-rating_count"}
        return qs.order_by("-is_featured", sort_map.get(p.get("sort_by","popularity"),"-rating_count"))


class RestaurantDetailView(generics.RetrieveAPIView):
    serializer_class   = RestaurantDetailSerializer
    permission_classes = [AllowAny]
    queryset           = Restaurant.objects.filter(is_active=True).prefetch_related("menu_categories__items")


class FeaturedRestaurantsView(generics.ListAPIView):
    serializer_class   = RestaurantListSerializer
    permission_classes = [AllowAny]
    queryset           = Restaurant.objects.filter(is_active=True, is_featured=True).order_by("-rating_avg")[:8]


class CuisineCategoryListView(generics.ListAPIView):
    serializer_class   = CuisineCategorySerializer
    permission_classes = [AllowAny]
    queryset           = CuisineCategory.objects.all()


class SearchView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        q = request.query_params.get("q","").strip()
        if len(q) < 2:
            return Response({"restaurants":[],"dishes":[]})
        rests   = Restaurant.objects.filter(Q(name__icontains=q)|Q(cuisine_tags__icontains=q),is_active=True)[:6]
        dishes  = MenuItem.objects.filter(Q(name__icontains=q),is_available=True,category__restaurant__is_active=True).select_related("category__restaurant")[:10]
        return Response({
            "restaurants": RestaurantListSerializer(rests,many=True).data,
            "dishes": [{"id":d.id,"name":d.name,"restaurant_id":d.category.restaurant.id,"restaurant_name":d.category.restaurant.name,"price":float(d.price),"image":d.image} for d in dishes],
        })


class CouponListView(generics.ListAPIView):
    serializer_class   = CouponSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Coupon.objects.filter(is_active=True, expires_at__gt=timezone.now())


class HotelDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def get(self, request):
        from apps.orders.models import Order
        from apps.reviews.models import Review
        restaurant = request.user.restaurant
        now = timezone.now()

        def period_stats(start):
            orders = Order.objects.filter(restaurant=restaurant, placed_at__gte=start, status=Order.Status.DELIVERED)
            agg = orders.aggregate(orders=Count("id"), revenue=Sum("total"), avg_order_value=Avg("total"))
            revs = Review.objects.filter(restaurant=restaurant, created_at__gte=start).count()
            return {"orders":agg["orders"] or 0,"revenue":float(agg["revenue"] or 0),"avg_order_value":round(float(agg["avg_order_value"] or 0),2),"reviews":revs,"new_reviews":revs}

        reviews_qs  = Review.objects.filter(restaurant=restaurant)
        breakdown   = {str(s): reviews_qs.filter(rating=s).count() for s in range(1,6)}
        recent      = Order.objects.filter(restaurant=restaurant).exclude(status__in=[Order.Status.DELIVERED,Order.Status.CANCELLED]).order_by("-placed_at")[:10]

        return Response({
            "today":      period_stats(now.replace(hour=0,minute=0,second=0,microsecond=0)),
            "this_week":  period_stats(now - timedelta(days=7)),
            "this_month": period_stats(now - timedelta(days=30)),
            "rating_overview": {"average":float(restaurant.rating_avg),"total":restaurant.rating_count,"breakdown":breakdown},
            "recent_orders": [{"id":o.id,"customer_name":o.customer.name,"items":[f"{i['name']} x{i['quantity']}" for i in o.items],"total":float(o.total),"status":o.status,"placed_at":o.placed_at.isoformat()} for o in recent],
        })


class HotelMenuView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def get(self, request):
        restaurant = request.user.restaurant
        cats = MenuCategory.objects.filter(restaurant=restaurant).prefetch_related("items")
        return Response({"categories":[{"id":c.id,"name":c.name,"icon":c.icon,"items_count":c.items.count(),"available_count":c.items.filter(is_available=True).count(),"items":MenuItemSerializer(c.items.all(),many=True).data} for c in cats]})


class HotelMenuItemToggleView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def patch(self, request, pk):
        try:
            item = MenuItem.objects.get(pk=pk, category__restaurant=request.user.restaurant)
        except MenuItem.DoesNotExist:
            return Response({"message":"Item not found."},status=404)
        item.is_available = not item.is_available
        item.save(update_fields=["is_available"])
        return Response({"id":item.id,"is_available":item.is_available,"message":f"'{item.name}' marked as {'available' if item.is_available else 'unavailable'}"})


class HotelMenuItemView(APIView):
    permission_classes = [IsAuthenticated, IsHotelAdmin]
    def patch(self, request, pk):
        try:
            item = MenuItem.objects.get(pk=pk, category__restaurant=request.user.restaurant)
        except MenuItem.DoesNotExist:
            return Response({"message":"Item not found."},status=404)
        s = MenuItemUpdateSerializer(item, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(MenuItemSerializer(item).data)
