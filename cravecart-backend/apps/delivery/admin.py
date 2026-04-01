from django.contrib import admin
from .models import DeliveryPartner, DeliveryAssignment, EarningsSummary

@admin.register(DeliveryPartner)
class DeliveryPartnerAdmin(admin.ModelAdmin):
    list_display  = ["user", "city", "vehicle_type", "is_online", "is_verified", "total_deliveries", "status"]
    list_filter   = ["status", "is_online", "is_verified", "vehicle_type"]
    search_fields = ["user__email", "user__name", "phone", "vehicle_number"]
    readonly_fields = ["total_deliveries", "total_earnings", "rating_avg", "rating_count", "joined_at"]
    actions = ["verify_partners"]

    @admin.action(description="Mark selected as verified")
    def verify_partners(self, request, qs):
        qs.update(is_verified=True)

@admin.register(DeliveryAssignment)
class DeliveryAssignmentAdmin(admin.ModelAdmin):
    list_display  = ["id", "order", "partner", "status", "total_earning", "assigned_at"]
    list_filter   = ["status"]
    readonly_fields = ["id", "assigned_at", "total_earning"]

@admin.register(EarningsSummary)
class EarningsSummaryAdmin(admin.ModelAdmin):
    list_display  = ["partner", "date", "deliveries", "earnings", "online_hours"]
    list_filter   = ["date"]
