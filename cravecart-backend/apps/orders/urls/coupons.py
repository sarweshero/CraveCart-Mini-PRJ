from django.urls import path
from apps.restaurants.views import CouponListView
app_name = "coupons"
urlpatterns = [path("", CouponListView.as_view(), name="list")]
