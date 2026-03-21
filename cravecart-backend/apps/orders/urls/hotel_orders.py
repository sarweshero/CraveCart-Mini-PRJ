from django.urls import path
from apps.orders import views
app_name = "hotel_orders"
urlpatterns = [
    path("", views.HotelOrderListView.as_view(), name="list"),
    path("<str:pk>/status/", views.HotelOrderStatusView.as_view(), name="status"),
]
