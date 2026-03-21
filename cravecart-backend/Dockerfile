# ── Stage 1: dependency builder ───────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install system deps for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into a prefix dir (keeps final image clean)
COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt


# ── Stage 2: final image ──────────────────────────────────
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod

WORKDIR /app

# Copy installed packages from builder stage
COPY --from=builder /install /usr/local

# Copy project source
COPY . .

# Create non-root user for security
RUN addgroup --system cravecart && adduser --system --group cravecart \
    && chown -R cravecart:cravecart /app

USER cravecart

# Collect static (requires env vars to be set)
# Run at container start instead to ensure env vars are available:
#   CMD python manage.py collectstatic --noinput && gunicorn ...

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--config", "gunicorn.conf.py"]
