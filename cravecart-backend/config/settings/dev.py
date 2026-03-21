"""
CraveCart — Development Settings
Override: DJANGO_SETTINGS_MODULE=config.settings.dev
"""
from .base import *  # noqa: F401, F403
import os

DEBUG = True
ALLOWED_HOSTS = ["*"]

# ── Dev email: print to console instead of sending real emails ────────────────
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ── Disable throttling locally so you're not rate-limited during dev ──────────
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []    # noqa: F405

# ── django-debug-toolbar (only if installed) ──────────────────────────────────
try:
    import debug_toolbar  # noqa: F401
    INSTALLED_APPS    += ["debug_toolbar"]         # noqa: F405
    MIDDLEWARE         = ["debug_toolbar.middleware.DebugToolbarMiddleware"] + MIDDLEWARE  # noqa: F405
    INTERNAL_IPS       = ["127.0.0.1"]
except ImportError:
    pass

# ── Verbose SQL logging ───────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "DEBUG"},
    "loggers": {
        "django.db.backends": {
            "handlers":  ["console"],
            "level":     os.environ.get("DJANGO_DB_LOG_LEVEL", "WARNING"),
            "propagate": False,
        },
    },
}

# ── Celery: run tasks synchronously in dev for easier debugging ───────────────
# Set CELERY_TASK_ALWAYS_EAGER=True in shell when you want instant execution:
# CELERY_TASK_ALWAYS_EAGER = True
