from django.urls import path
from apps.restaurants import views
app_name = "restaurants"
urlpatterns = [
    path("", views.RestaurantListView.as_view(), name="list"),
    path("featured/", views.FeaturedRestaurantsView.as_view(), name="featured"),
    path("<int:pk>/", views.RestaurantDetailView.as_view(), name="detail"),
]
