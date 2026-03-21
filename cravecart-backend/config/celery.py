"""Celery application configuration for CraveCart."""
import os
from celery import Celery

# FIX BE-6: respect DJANGO_SETTINGS_MODULE env var — falls back to prod, not dev
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

app = Celery("cravecart")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
