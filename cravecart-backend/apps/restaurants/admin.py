from django.contrib import admin
from .models import Restaurant, MenuCategory, MenuItem, CuisineCategory, Coupon

@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display   = ["name", "city", "is_open", "is_active", "is_featured", "rating_avg", "rating_count"]
    list_filter    = ["is_open", "is_active", "is_featured", "city"]
    search_fields  = ["name", "city", "owner__email"]
    prepopulated_fields = {"slug": ("name",)}
    list_editable  = ["is_open", "is_featured"]

@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display  = ["restaurant", "name", "order"]
    list_filter   = ["restaurant"]

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display  = ["name", "category", "price", "is_veg", "is_available", "is_bestseller"]
    list_filter   = ["is_available", "is_veg", "is_bestseller"]
    list_editable = ["is_available", "is_bestseller"]
    search_fields = ["name"]

@admin.register(CuisineCategory)
class CuisineCategoryAdmin(admin.ModelAdmin):
    list_display  = ["name", "icon", "color", "order"]
    list_editable = ["order"]

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display  = ["code", "coupon_type", "value", "is_active", "expires_at", "used_count"]
    list_filter   = ["is_active", "coupon_type"]
    search_fields = ["code"]
