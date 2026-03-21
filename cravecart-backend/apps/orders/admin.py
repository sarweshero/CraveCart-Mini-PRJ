from django.contrib import admin
from .models import Cart, CartItem, Order

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display   = ["id", "customer", "restaurant", "status", "total", "payment_status", "placed_at"]
    list_filter    = ["status", "payment_status", "payment_method"]
    search_fields  = ["id", "customer__email", "restaurant__name"]
    readonly_fields = ["id", "placed_at"]
    date_hierarchy = "placed_at"

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["user", "restaurant", "coupon", "updated_at"]
