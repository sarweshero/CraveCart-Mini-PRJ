from django.urls import path
from apps.restaurants import views
app_name = "search"
urlpatterns = [path("", views.SearchView.as_view(), name="search")]
