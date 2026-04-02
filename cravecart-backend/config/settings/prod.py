from pathlib import Path
import environ
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY    = env("SECRET_KEY")
DEBUG         = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "rest_framework",
    "corsheaders",
    "django_filters",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "django_celery_beat",
    "django_celery_results",
    "storages",
    "django_redis",
    "apps.accounts",
    "apps.restaurants",
    "apps.orders",
    "apps.reviews",
    "apps.notifications",
    "apps.ai_templates",
    "apps.delivery",
]

SITE_ID = 1

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

ROOT_URLCONF     = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
AUTH_USER_MODEL  = "accounts.User"

TEMPLATES = [{"BACKEND": "django.template.backends.django.DjangoTemplates",
              "DIRS": [BASE_DIR / "templates"], "APP_DIRS": True,
              "OPTIONS": {"context_processors": [
                  "django.template.context_processors.debug",
                  "django.template.context_processors.request",
                  "django.contrib.auth.context_processors.auth",
                  "django.contrib.messages.context_processors.messages",
              ]}}]

DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["CONN_MAX_AGE"]       = 600
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
DATABASES["default"]["OPTIONS"]            = {"sslmode": "require", "connect_timeout": 10}

STATIC_URL  = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL   = "/media/"
MEDIA_ROOT  = BASE_DIR / "media"

STORAGES = {
    "default":     {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
AWS_ACCESS_KEY_ID        = env("SUPABASE_S3_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY    = env("SUPABASE_S3_SECRET", default="")
AWS_STORAGE_BUCKET_NAME  = env("SUPABASE_STORAGE_BUCKET", default="")
AWS_S3_ENDPOINT_URL      = env("SUPABASE_S3_ENDPOINT", default="")
AWS_QUERYSTRING_AUTH     = False
AWS_S3_FILE_OVERWRITE    = False
AWS_DEFAULT_ACL          = "public-read"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE      = "en-us"
TIME_ZONE          = "Asia/Kolkata"
USE_I18N           = True
USE_TZ             = True

# Nginx handles SSL termination — Django must NOT redirect
SECURE_SSL_REDIRECT         = False
SECURE_PROXY_SSL_HEADER     = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_BROWSER_XSS_FILTER   = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS             = "DENY"
SESSION_COOKIE_SECURE       = True
CSRF_COOKIE_SECURE          = True

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Allow deployed frontends by default while still supporting local development.
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "https://cravecart.sarweshero.me",
        "https://hotel.sarweshero.me",
        "https://delivery.sarweshero.me",
    ],
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ["accept","accept-encoding","authorization","content-type","dnt","origin","user-agent","x-csrftoken","x-requested-with"]
CORS_ALLOWED_ORIGIN_REGEXES = env.list("CORS_ALLOWED_ORIGIN_REGEXES", default=[])

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.accounts.authentication.CraveCartTokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES":     ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "utils.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "EXCEPTION_HANDLER": "utils.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "100/hour", "user": "2000/hour", "login": "10/min", "hotel_register": "3/hour"},
}

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]
ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_LOGIN_METHODS      = {"email"}
ACCOUNT_EMAIL_REQUIRED     = True
ACCOUNT_EMAIL_VERIFICATION = "optional"
ACCOUNT_USERNAME_REQUIRED  = False
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
SOCIALACCOUNT_AUTO_SIGNUP  = True
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_PROVIDERS = {"google": {
    "SCOPE": ["profile","email"],
    "AUTH_PARAMS": {"access_type": "online"},
    "APP": {
        "client_id": env("GOOGLE_CLIENT_ID", default=""),
        "secret":    env("GOOGLE_CLIENT_SECRET", default=""),
        "key": "",
    },
}}

DEFAULT_FROM_EMAIL  = env("DEFAULT_FROM_EMAIL", default="CraveCart <noreply@cravecart.com>")
EMAIL_BACKEND       = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST          = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT          = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")

CACHES = {"default": {
    "BACKEND":  "django_redis.cache.RedisCache",
    "LOCATION": env("REDIS_CACHE_URL", default="redis://127.0.0.1:6379/1"),
    "OPTIONS":  {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    "TIMEOUT":  600,
}}

CELERY_BROKER_URL        = env("REDIS_URL", default="redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND    = "django-db"
CELERY_ACCEPT_CONTENT    = ["json"]
CELERY_TASK_SERIALIZER   = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE          = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    "flush-emails":      {"task": "apps.notifications.tasks.flush_email_batch",      "schedule": crontab(minute="*/5")},
    "cleanup-tokens":    {"task": "apps.accounts.tasks.cleanup_expired_tokens",      "schedule": crontab(hour=2, minute=0)},
    "process-deletions": {"task": "apps.accounts.tasks.process_permanent_deletions", "schedule": crontab(hour=3, minute=0)},
}

GEMINI_API_KEY           = env("GEMINI_API_KEY", default="")
GEMINI_MODEL             = "gemini-1.5-flash"
GEMINI_MAX_OUTPUT_TOKENS = 300

CUSTOMER_FRONTEND_URL        = env("CUSTOMER_FRONTEND_URL")
HOTEL_FRONTEND_URL           = env("HOTEL_FRONTEND_URL")
DELIVERY_FRONTEND_URL        = env("DELIVERY_FRONTEND_URL")
CRAVECART_TOKEN_EXPIRY_DAYS   = 1
CRAVECART_REFRESH_EXPIRY_DAYS = 30
MIN_ORDER_AMOUNT              = 50
PLATFORM_FEE                  = 5
DEFAULT_DELIVERY_FEE          = 30
TAX_RATE                      = 0.05
PERMANENT_DELETE_AFTER_DAYS   = 30

LOGGING = {
    "version": 1, "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "[{asctime}] {levelname} {name}: {message}", "style": "{"}},
    "handlers":   {"console": {"class": "logging.StreamHandler", "formatter": "simple"}},
    "root":       {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django":         {"handlers": ["console"], "level": "WARNING",  "propagate": False},
        "django.request": {"handlers": ["console"], "level": "ERROR",    "propagate": False},
        "apps":           {"handlers": ["console"], "level": "INFO",     "propagate": False},
    },
}

# ── Additional Security Headers ────────────────────────────────────────────
SECURE_HSTS_SECONDS            = 31536000   # 1 year HSTS
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD            = True
SECURE_REFERRER_POLICY         = "strict-origin-when-cross-origin"
PERMISSIONS_POLICY             = {"geolocation": [], "camera": [], "microphone": []}

# ── Razorpay ────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID     = env("RAZORPAY_KEY_ID",     default="")
RAZORPAY_KEY_SECRET = env("RAZORPAY_KEY_SECRET", default="")

# ── Delivery Config ──────────────────────────────────────────────────────────
DELIVERY_BASE_EARNING  = 25
DELIVERY_PER_KM_BONUS  = 5
DELIVERY_ACCEPT_WINDOW = 60
