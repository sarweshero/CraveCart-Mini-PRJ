from django.urls import path
from apps.restaurants.views_coupon import HotelCouponListCreateView, HotelCouponDetailView

app_name = "hotel_coupons"
urlpatterns = [
    path("",         HotelCouponListCreateView.as_view(), name="list_create"),
    path("<int:pk>/", HotelCouponDetailView.as_view(),    name="detail"),
]
