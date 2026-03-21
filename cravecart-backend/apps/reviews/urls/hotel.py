from django.urls import path
from apps.reviews import views
app_name = "hotel_reviews"
urlpatterns = [
    path("", views.HotelReviewListView.as_view(), name="list"),
    path("<int:pk>/generate-ai-response/", views.HotelGenerateAIResponseView.as_view(), name="generate"),
    path("<int:pk>/send-response/", views.HotelSendAIResponseView.as_view(), name="send"),
]
