from django.db import models

class EmailRecord(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued","Queued"
        SENT   = "sent","Sent"
        FAILED = "failed","Failed"

    to         = models.EmailField(db_index=True)
    subject    = models.CharField(max_length=255)
    text_body  = models.TextField()
    html_body  = models.TextField(blank=True)
    cc         = models.JSONField(default=list)
    status     = models.CharField(max_length=10, choices=Status.choices, default=Status.QUEUED, db_index=True)
    error      = models.TextField(blank=True)
    metadata   = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "email_records"
        ordering = ["created_at"]
        indexes  = [models.Index(fields=["status","created_at"])]

    def __str__(self):
        return f"Email({self.to}, {self.subject[:40]}, {self.status})"
