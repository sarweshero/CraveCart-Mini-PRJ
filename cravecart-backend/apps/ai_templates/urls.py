from django.urls import path
from . import views
app_name = "ai_templates"
urlpatterns = [
    path("", views.AITemplateListCreateView.as_view(), name="list_create"),
    path("<int:pk>/", views.AITemplateDetailView.as_view(), name="detail"),
    path("<int:pk>/set-active/", views.AITemplateSetActiveView.as_view(), name="set_active"),
]
