from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health(request):
    try:
        from django.db import connection
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    return JsonResponse({"status": "ok" if db_ok else "degraded", "db": db_ok},
                        status=200 if db_ok else 503)


API = "api/"
urlpatterns = [
    path("health/", health),
    path("admin/",  admin.site.urls),
    # Customer
    path(f"{API}auth/",        include("apps.accounts.urls",               namespace="accounts")),
    path(f"{API}restaurants/", include("apps.restaurants.urls.customer",   namespace="restaurants")),
    path(f"{API}categories/",  include("apps.restaurants.urls.categories", namespace="categories")),
    path(f"{API}cart/",        include("apps.orders.urls.cart",            namespace="cart")),
    path(f"{API}orders/",      include("apps.orders.urls.orders",          namespace="orders")),
    path(f"{API}reviews/",     include("apps.reviews.urls.customer",       namespace="reviews")),
    path(f"{API}coupons/",     include("apps.orders.urls.coupons",         namespace="coupons")),
    path(f"{API}search/",      include("apps.restaurants.urls.search",     namespace="search")),
    # Hotel
    path(f"{API}hotel/auth/",         include("apps.accounts.urls_hotel",              namespace="hotel_accounts")),
    path(f"{API}hotel/dashboard/",    include("apps.restaurants.urls.hotel_dashboard", namespace="hotel_dashboard")),
    path(f"{API}hotel/orders/",       include("apps.orders.urls.hotel_orders",         namespace="hotel_orders")),
    path(f"{API}hotel/reviews/",      include("apps.reviews.urls.hotel",               namespace="hotel_reviews")),
    path(f"{API}hotel/ai-templates/", include("apps.ai_templates.urls",                namespace="ai_templates")),
    path(f"{API}hotel/menu/",         include("apps.restaurants.urls.hotel_menu",      namespace="hotel_menu")),
    path(f"{API}hotel/coupons/",      include("apps.restaurants.urls.hotel_coupons",   namespace="hotel_coupons")),
    # Delivery Partner
    path(f"{API}delivery/",    include("apps.delivery.urls",  namespace="delivery")),
    # Payments
    path(f"{API}payments/",    include("apps.payments.urls",  namespace="payments")),
]
try:
    urlpatterns += [path("accounts/", include("allauth.urls"))]
except Exception:
    pass
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
