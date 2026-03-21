from django.urls import path
from apps.orders import views
app_name = "cart"
urlpatterns = [
    path("", views.CartView.as_view(), name="cart"),
    path("add/", views.CartAddItemView.as_view(), name="add"),
    path("items/<int:pk>/", views.CartUpdateItemView.as_view(), name="item"),
    path("apply-coupon/", views.CartApplyCouponView.as_view(), name="apply_coupon"),
    path("remove-coupon/", views.CartRemoveCouponView.as_view(), name="remove_coupon"),
    path("clear/", views.CartClearView.as_view(), name="clear"),
]
