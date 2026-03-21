from django.contrib import admin
from .models import Review, AIResponse

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ["customer", "restaurant", "rating", "created_at"]
    list_filter   = ["rating"]
    search_fields = ["customer__email", "restaurant__name"]

@admin.register(AIResponse)
class AIResponseAdmin(admin.ModelAdmin):
    list_display  = ["review", "generation_status", "email_sent", "generated_at"]
    list_filter   = ["generation_status", "email_sent"]
    readonly_fields = ["generated_at"]
