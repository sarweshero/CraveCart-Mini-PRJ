"""apps/accounts/urls_hotel.py — Hotel portal auth routes."""
from django.urls import path
from . import views
from .hotel_register_view import HotelRegisterView

app_name = "hotel_accounts"

urlpatterns = [
    path("register/", HotelRegisterView.as_view(), name="hotel_register"),
    path("login/",    views.LoginView.as_view(),   name="hotel_login"),
    path("logout/",   views.LogoutView.as_view(),  name="hotel_logout"),
    path("me/",       views.MeView.as_view(),       name="hotel_me"),
]
