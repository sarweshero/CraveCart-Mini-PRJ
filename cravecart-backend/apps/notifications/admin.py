from django.contrib import admin
from .models import EmailRecord
@admin.register(EmailRecord)
class EmailRecordAdmin(admin.ModelAdmin):
    list_display  = ["to","subject","status","created_at","sent_at"]
    list_filter   = ["status"]
    search_fields = ["to","subject"]
    readonly_fields = ["created_at","sent_at"]
