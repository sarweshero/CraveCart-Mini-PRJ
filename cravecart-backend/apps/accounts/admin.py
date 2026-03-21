from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, AuthToken, Address


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display   = ["email", "name", "role", "is_profile_complete", "is_active", "created_at"]
    list_filter    = ["role", "is_active", "is_profile_complete", "deletion_type"]
    search_fields  = ["email", "name", "phone"]
    ordering       = ["-created_at"]
    readonly_fields = ["created_at", "updated_at", "google_id"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal", {"fields": ("name", "phone", "avatar")}),
        ("Role & Status", {"fields": ("role", "is_profile_complete", "is_active", "is_staff", "is_superuser")}),
        ("Deletion", {"fields": ("deletion_type", "deletion_requested_at", "permanent_delete_at")}),
        ("OAuth", {"fields": ("google_id",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "role")}),
    )


@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
    list_display  = ["user", "is_revoked", "access_expires", "created_at"]
    list_filter   = ["is_revoked"]
    search_fields = ["user__email"]
    readonly_fields = ["access_token", "refresh_token", "created_at"]


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display  = ["user", "label", "city", "pincode", "is_default"]
    search_fields = ["user__email", "city"]
