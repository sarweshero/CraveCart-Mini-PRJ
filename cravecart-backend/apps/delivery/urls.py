from django.urls import path
from . import views

app_name = "delivery"
urlpatterns = [
    path("auth/register/",                        views.DeliveryRegisterView.as_view(),      name="register"),
    path("auth/login/",                           views.DeliveryLoginView.as_view(),          name="login"),
    path("auth/me/",                              views.DeliveryMeView.as_view(),             name="me"),
    path("auth/toggle-online/",                   views.DeliveryToggleOnlineView.as_view(),  name="toggle_online"),
    path("auth/location/",                        views.DeliveryLocationUpdateView.as_view(), name="location"),
    path("assignments/active/",                   views.ActiveAssignmentView.as_view(),       name="active"),
    path("assignments/history/",                  views.DeliveryHistoryView.as_view(),        name="history"),
    path("assignments/<uuid:pk>/<str:action>/",   views.AssignmentActionView.as_view(),      name="action"),
    path("earnings/",                             views.EarningsDashboardView.as_view(),      name="earnings"),
]
