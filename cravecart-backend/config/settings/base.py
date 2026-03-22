"""
CraveCart — Base Django Settings
Shared across all environments. Environment-specific overrides in dev.py / prod.py.
"""
import os
from pathlib import Path
import environ

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ── Environment ───────────────────────────────────────────────────────────────
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG      = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# ── Application Definition ────────────────────────────────────────────────────
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "django_filters",
    # allauth — FIX BUG-01/17: use new-style app names for allauth>=65
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    # Celery result backend
    "django_celery_beat",
    "django_celery_results",
    # Storage + cache
    "storages",
    "django_redis",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.restaurants",
    "apps.orders",
    "apps.reviews",
    "apps.notifications",
    "apps.ai_templates",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

SITE_ID = 1

# ── Middleware ─────────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS":    [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ── Database ──────────────────────────────────────────────────────────────────
DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["CONN_MAX_AGE"]       = 60
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

# ── Custom User Model ─────────────────────────────────────────────────────────
AUTH_USER_MODEL = "accounts.User"

# ── Password Validation ───────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ── i18n ──────────────────────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE     = "Asia/Kolkata"
USE_I18N      = True
USE_TZ        = True

# ── Static / Media ────────────────────────────────────────────────────────────
STATIC_URL  = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL   = "/media/"
MEDIA_ROOT  = BASE_DIR / "media"

# FIX BUG-02/14: Use STORAGES dict (Django 4.2+ / Django 5 style).
# Do NOT set STATICFILES_STORAGE — it conflicts with STORAGES in Django 5.
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.CraveCartTokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "utils.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "EXCEPTION_HANDLER": "utils.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon":          "100/hour",
        "user":          "2000/hour",
        "login":         "10/min",
        "review_submit": "5/hour",
    },
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://localhost:3001"],
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization",
    "content-type", "dnt", "origin",
    "user-agent", "x-csrftoken", "x-requested-with",
]

# ── Token Auth ────────────────────────────────────────────────────────────────
CRAVECART_TOKEN_EXPIRY_DAYS   = 1
CRAVECART_REFRESH_EXPIRY_DAYS = 30

# ── Authentication backends ───────────────────────────────────────────────────
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# ── Allauth — FIX BUG-17: allauth >= 65 new-style settings ──────────────────
# Old API (< 65): ACCOUNT_AUTHENTICATION_METHOD, ACCOUNT_EMAIL_REQUIRED etc.
# New API (>= 65): ACCOUNT_LOGIN_METHODS, ACCOUNT_EMAIL_VERIFICATION etc.
ACCOUNT_LOGIN_METHODS        = {"email"}      # login via email only (not username)
ACCOUNT_EMAIL_REQUIRED       = True
ACCOUNT_EMAIL_VERIFICATION   = "optional"     # don't block login if email not verified
ACCOUNT_USERNAME_REQUIRED    = False
ACCOUNT_UNIQUE_EMAIL         = True

SOCIALACCOUNT_AUTO_SIGNUP    = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
        "APP": {
            "client_id": env("GOOGLE_CLIENT_ID", default=""),
            "secret":    env("GOOGLE_CLIENT_SECRET", default=""),
            "key":       "",
        },
    }
}

# ── Email ─────────────────────────────────────────────────────────────────────
DEFAULT_FROM_EMAIL    = env("DEFAULT_FROM_EMAIL", default="CraveCart <noreply@cravecart.com>")
EMAIL_BACKEND         = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST            = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT            = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS         = True
EMAIL_HOST_USER       = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD   = env("EMAIL_HOST_PASSWORD", default="")

# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL          = env("REDIS_URL", default="redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND      = "django-db"
CELERY_CACHE_BACKEND       = "default"
CELERY_ACCEPT_CONTENT      = ["json"]
CELERY_TASK_SERIALIZER     = "json"
CELERY_RESULT_SERIALIZER   = "json"
CELERY_TIMEZONE            = TIME_ZONE
CELERY_TASK_TRACK_STARTED  = True
CELERY_TASK_TIME_LIMIT     = 30 * 60

# FIX BUG-07: Import crontab lazily to avoid module-level Celery init
# (celery.schedules is safe to import at settings load time, but
# we keep it here for clarity — it's a lightweight import)
from celery.schedules import crontab  # noqa: E402
CELERY_BEAT_SCHEDULE = {
    "flush-email-batch-every-5-minutes": {
        "task":     "apps.notifications.tasks.flush_email_batch",
        "schedule": crontab(minute="*/5"),
    },
    "cleanup-expired-tokens-daily": {
        "task":     "apps.accounts.tasks.cleanup_expired_tokens",
        "schedule": crontab(hour=2, minute=0),
    },
    "process-permanent-deletions-daily": {
        "task":     "apps.accounts.tasks.process_permanent_deletions",
        "schedule": crontab(hour=3, minute=0),
    },
}

# ── Cache (Redis) ─────────────────────────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND":  "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_CACHE_URL", default="redis://127.0.0.1:6379/1"),
        "OPTIONS":  {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "TIMEOUT":  600,
    }
}

# ── Google Gemini ─────────────────────────────────────────────────────────────
GEMINI_API_KEY         = env("GEMINI_API_KEY", default="")
GEMINI_MODEL           = "gemini-1.5-flash"
GEMINI_MAX_OUTPUT_TOKENS = 300

# ── App Constants ─────────────────────────────────────────────────────────────
MIN_ORDER_AMOUNT          = 50
PLATFORM_FEE              = 5
DEFAULT_DELIVERY_FEE      = 30
TAX_RATE                  = 0.05
PERMANENT_DELETE_AFTER_DAYS = 30
