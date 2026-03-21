"""CraveCart — Root URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

API_PREFIX = "api/"


# ── Health-check endpoint (BE-13) ─────────────────────────────────────────────
def health_check(request):
    """
    Simple liveness probe used by Railway / Render / load balancers.
    Returns 200 immediately so the platform knows the process is alive.
    Checks DB connectivity as a bonus readiness signal.
    """
    try:
        from django.db import connection
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    status = 200 if db_ok else 503
    return JsonResponse({"status": "ok" if db_ok else "degraded", "db": db_ok}, status=status)


urlpatterns = [
    # Health probe — no auth, no throttle
    path("health/", health_check, name="health_check"),

    # Admin
    path("admin/", admin.site.urls),

    # Auth (customer + hotel share this)
    path(f"{API_PREFIX}auth/",  include("apps.accounts.urls",       namespace="accounts")),

    # Customer-facing APIs
    path(f"{API_PREFIX}restaurants/", include("apps.restaurants.urls.customer",       namespace="restaurants")),
    path(f"{API_PREFIX}categories/",  include("apps.restaurants.urls.categories",     namespace="categories")),
    path(f"{API_PREFIX}cart/",        include("apps.orders.urls.cart",                namespace="cart")),
    path(f"{API_PREFIX}orders/",      include("apps.orders.urls.orders",              namespace="orders")),
    path(f"{API_PREFIX}reviews/",     include("apps.reviews.urls.customer",           namespace="reviews")),
    path(f"{API_PREFIX}coupons/",     include("apps.orders.urls.coupons",             namespace="coupons")),
    path(f"{API_PREFIX}search/",      include("apps.restaurants.urls.search",         namespace="search")),

    # Hotel Portal APIs
    path(f"{API_PREFIX}hotel/auth/",          include("apps.accounts.urls_hotel",                   namespace="hotel_accounts")),
    path(f"{API_PREFIX}hotel/dashboard/",     include("apps.restaurants.urls.hotel_dashboard",      namespace="hotel_dashboard")),
    path(f"{API_PREFIX}hotel/orders/",        include("apps.orders.urls.hotel_orders",              namespace="hotel_orders")),
    path(f"{API_PREFIX}hotel/reviews/",       include("apps.reviews.urls.hotel",                    namespace="hotel_reviews")),
    path(f"{API_PREFIX}hotel/ai-templates/",  include("apps.ai_templates.urls",                     namespace="ai_templates")),
    path(f"{API_PREFIX}hotel/menu/",          include("apps.restaurants.urls.hotel_menu",           namespace="hotel_menu")),

    # Google OAuth (allauth)
    path("accounts/", include("allauth.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # FIX BE-5: guard debug_toolbar — only import when installed AND debug mode
    try:
        import debug_toolbar
        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
