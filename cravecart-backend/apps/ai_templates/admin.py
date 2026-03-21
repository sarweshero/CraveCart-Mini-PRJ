from django.contrib import admin
from .models import AITemplate

@admin.register(AITemplate)
class AITemplateAdmin(admin.ModelAdmin):
    list_display  = ["restaurant", "name", "tone", "is_active", "usage_count", "created_at"]
    list_filter   = ["tone", "is_active"]
    search_fields = ["restaurant__name", "name"]
    list_editable = ["is_active"]
