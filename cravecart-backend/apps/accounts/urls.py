"""apps/accounts/urls.py — Customer auth routes."""
from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    path("register/",         views.RegisterView.as_view(),         name="register"),
    path("login/",            views.LoginView.as_view(),             name="login"),
    path("logout/",           views.LogoutView.as_view(),            name="logout"),
    path("token/refresh/",    views.TokenRefreshView.as_view(),      name="token_refresh"),
    path("me/",               views.MeView.as_view(),                name="me"),
    path("complete-profile/", views.CompleteProfileView.as_view(),   name="complete_profile"),
    path("addresses/",        views.AddressListCreateView.as_view(), name="addresses"),
    path("addresses/<int:pk>/", views.AddressDetailView.as_view(),   name="address_detail"),
    path("delete-account/",   views.DeleteAccountView.as_view(),     name="delete_account"),
    path("google/callback/",  views.GoogleOAuthCallbackView.as_view(), name="google_callback"),
]
