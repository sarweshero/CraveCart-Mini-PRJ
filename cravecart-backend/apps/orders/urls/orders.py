from django.urls import path
from apps.orders import views
app_name = "orders"
urlpatterns = [
    path("", views.OrderListCreateView.as_view(), name="list_create"),
    path("<str:pk>/", views.OrderDetailView.as_view(), name="detail"),
    path("<str:pk>/cancel/", views.OrderCancelView.as_view(), name="cancel"),
]
