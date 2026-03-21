from django.urls import path
from apps.restaurants import views
app_name = "hotel_menu"
urlpatterns = [
    path("", views.HotelMenuView.as_view(), name="menu"),
    path("items/<int:pk>/", views.HotelMenuItemView.as_view(), name="item_detail"),
    path("items/<int:pk>/toggle/", views.HotelMenuItemToggleView.as_view(), name="item_toggle"),
]
