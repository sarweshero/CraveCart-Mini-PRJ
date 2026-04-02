from django.urls import path
from apps.restaurants import views
from apps.restaurants.views_coupon import HotelToggleOpenView

app_name = "hotel_dashboard"
urlpatterns = [
    path("stats/",       views.HotelDashboardView.as_view(), name="stats"),
    path("profile/",     views.HotelProfileView.as_view(),   name="profile"),
    path("toggle-open/", HotelToggleOpenView.as_view(),      name="toggle_open"),
]
