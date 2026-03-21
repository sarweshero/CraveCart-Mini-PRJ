from django.urls import path
from apps.restaurants import views
app_name = "hotel_dashboard"
urlpatterns = [path("stats/", views.HotelDashboardView.as_view(), name="stats")]
