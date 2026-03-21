from django.urls import path
from apps.restaurants import views
app_name = "categories"
urlpatterns = [path("", views.CuisineCategoryListView.as_view(), name="list")]
