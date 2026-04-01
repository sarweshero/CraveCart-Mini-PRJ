from django.urls import path
from apps.delivery.views import PaymentInitiateView, PaymentVerifyView

app_name = "payments"
urlpatterns = [
    path("initiate/", PaymentInitiateView.as_view(), name="initiate"),
    path("verify/",   PaymentVerifyView.as_view(),   name="verify"),
]
