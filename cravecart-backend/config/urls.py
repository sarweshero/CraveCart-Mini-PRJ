"""CraveCart — Root URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

API_PREFIX = "api/"


def health_check(request):
    """Liveness probe for Nginx/load-balancer health checks."""
    try:
        from django.db import connection
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    status_code = 200 if db_ok else 503
    return JsonResponse(
        {"status": "ok" if db_ok else "degraded", "db": db_ok},
        status=status_code
    )


urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("admin/",  admin.site.urls),

    # Auth
    path(f"{API_PREFIX}auth/", include("apps.accounts.urls", namespace="accounts")),

    # Customer APIs
    path(f"{API_PREFIX}restaurants/", include("apps.restaurants.urls.customer",   namespace="restaurants")),
    path(f"{API_PREFIX}categories/",  include("apps.restaurants.urls.categories", namespace="categories")),
    path(f"{API_PREFIX}cart/",        include("apps.orders.urls.cart",            namespace="cart")),
    path(f"{API_PREFIX}orders/",      include("apps.orders.urls.orders",          namespace="orders")),
    path(f"{API_PREFIX}reviews/",     include("apps.reviews.urls.customer",       namespace="reviews")),
    path(f"{API_PREFIX}coupons/",     include("apps.orders.urls.coupons",         namespace="coupons")),
    path(f"{API_PREFIX}search/",      include("apps.restaurants.urls.search",     namespace="search")),

    # Hotel APIs
    path(f"{API_PREFIX}hotel/auth/",          include("apps.accounts.urls_hotel",                namespace="hotel_accounts")),
    path(f"{API_PREFIX}hotel/dashboard/",     include("apps.restaurants.urls.hotel_dashboard",   namespace="hotel_dashboard")),
    path(f"{API_PREFIX}hotel/orders/",        include("apps.orders.urls.hotel_orders",           namespace="hotel_orders")),
    path(f"{API_PREFIX}hotel/reviews/",       include("apps.reviews.urls.hotel",                 namespace="hotel_reviews")),
    path(f"{API_PREFIX}hotel/ai-templates/",  include("apps.ai_templates.urls",                  namespace="ai_templates")),
    path(f"{API_PREFIX}hotel/menu/",          include("apps.restaurants.urls.hotel_menu",        namespace="hotel_menu")),
]

# FIX BUG-13: Guard allauth URLs — only include if allauth is properly installed
# We only need OAuth flow; allauth's HTML views are optional for a pure API backend
try:
    urlpatterns += [path("accounts/", include("allauth.urls"))]
except Exception:
    pass  # allauth URL import fails gracefully; OAuth still works via social auth

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
