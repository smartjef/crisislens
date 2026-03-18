"""Django settings for CrisisLens MVP."""
from __future__ import annotations

import environ
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "whitenoise.runserver_nostatic",  # serve static files without collectstatic in dev
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "channels",
    "django_celery_beat",
    # CrisisLens apps — api first so County model exists before accounts FK
    "api",
    "accounts",
]

# Custom user model — must be declared before the first migration
AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serve admin/static CSS in all envs
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "crisislens.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "crisislens.wsgi.application"
ASGI_APPLICATION = "crisislens.asgi.application"

# ── Redis / Channels ──────────────────────────────────────────────────────────
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {"hosts": [REDIS_URL]},
    }
}

# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TIMEZONE = "Africa/Nairobi"
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]

DATABASES = {
    "default": env.db()
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"   # required by collectstatic
# WhiteNoise — compress & cache static files, works without collectstatic in dev
WHITENOISE_USE_FINDERS = True
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Broadcast Configurations ────────────────────────────────────────────────────
# Email (Brevo / General SMTP)
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("SMTP_HOST", default="smtp-relay.brevo.com")
EMAIL_PORT = env.int("SMTP_PORT", default=587)
EMAIL_HOST_USER = env("SMTP_USER", default="")
EMAIL_HOST_PASSWORD = env("SMTP_PASS", default="")
EMAIL_USE_TLS = True
DEFAULT_FROM_EMAIL = f'{env("FROM_NAME", default="CrisisLens")} <{env("FROM_EMAIL", default="info@mauzoplus.app")}>'

# TextSMS.co.ke API (Onfon)
TEXTSMS_API_KEY = env("ONFON_API_KEY", default="")
TEXTSMS_PARTNER_ID = env("ONFON_PARTNER_ID", default="")
TEXTSMS_SHORTCODE = env("ONFON_SHORTCODE", default="LENGO")
TEXTSMS_BULK_URL = "https://sms.textsms.co.ke/api/services/sendbulk/"

# Pusher Channels & Beams
PUSHER_APP_ID = env("PUSHER_APP_ID", default="")
PUSHER_KEY = env("PUSHER_KEY", default="")
PUSHER_SECRET = env("PUSHER_SECRET", default="")
PUSHER_CLUSTER = env("PUSHER_CLUSTER", default="")
PUSHER_BEAMS_INSTANCE_ID = env("PUSHER_BEAMS_INSTANCE_ID", default="")
PUSHER_BEAMS_SECRET_KEY = env("PUSHER_BEAMS_SECRET_KEY", default="")

# ── Open AI ────────────────────────────────────────────────────────────────────
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])

# ── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        # All endpoints require auth by default; override per-view with AllowAny
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "UNAUTHENTICATED_USER": None,
}

# ── SimpleJWT ────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":    timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME":   timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":    True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES":        ("Bearer",),
    "USER_ID_FIELD":            "id",
    "USER_ID_CLAIM":            "user_id",
}

# ── Password validators ───────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "accounts.validators.UppercaseValidator"},
    {"NAME": "accounts.validators.DigitValidator"},
    {"NAME": "accounts.validators.SpecialCharValidator"},
]

# ── Password rotation ─────────────────────────────────────────────────────────
PASSWORD_ROTATION_DAYS = 90
