from django.urls import path
from apps.reviews import views
app_name = "reviews"
urlpatterns = [
    path("", views.ReviewCreateView.as_view(), name="create"),
    path("<int:pk>/ai-response/", views.ReviewAIResponseStatusView.as_view(), name="ai_status"),
]
