"""Utility helpers for user-uploaded media stored via Django's default storage backend."""
import posixpath
import re
from datetime import datetime
from urllib.parse import quote, urlparse, unquote
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import default_storage


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def sanitize_folder(folder: str, default: str = "uploads/general") -> str:
    """Keep folder path safe and normalized for storage keys."""
    cleaned = (folder or default).strip().replace("\\", "/")
    cleaned = re.sub(r"[^a-zA-Z0-9_\-/]", "", cleaned)
    cleaned = re.sub(r"/+", "/", cleaned).strip("/")
    if not cleaned:
        cleaned = default
    return cleaned


def build_upload_path(original_name: str, folder: str = "uploads/general") -> str:
    ext = ".jpg"
    if "." in original_name:
        ext = "." + original_name.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        ext = ".jpg"
    date_path = datetime.utcnow().strftime("%Y/%m/%d")
    safe_folder = sanitize_folder(folder)
    return f"{safe_folder}/{date_path}/{uuid4().hex}{ext}"


def _strip_known_prefixes(path: str) -> str:
    path = path.strip("/")

    parts = path.split("/")
    if len(parts) >= 6 and parts[:4] == ["storage", "v1", "object", "public"]:
        # /storage/v1/object/public/<bucket>/<key>
        path = "/".join(parts[5:])
    elif len(parts) >= 5 and parts[:3] == ["storage", "v1", "s3"]:
        # /storage/v1/s3/<bucket>/<key>
        path = "/".join(parts[4:])

    bucket = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
    if bucket and path.startswith(f"{bucket}/"):
        path = path[len(bucket) + 1 :]
    if path.startswith("media/"):
        path = path[len("media/") :]
    return path


def _supabase_public_base_url() -> str | None:
    explicit_base = (getattr(settings, "SUPABASE_PUBLIC_BASE_URL", "") or "").strip().rstrip("/")
    if explicit_base:
        return explicit_base

    endpoint = (getattr(settings, "AWS_S3_ENDPOINT_URL", "") or "").strip()
    bucket = (getattr(settings, "AWS_STORAGE_BUCKET_NAME", "") or "").strip()
    if not endpoint or not bucket:
        return None

    parsed = urlparse(endpoint)
    if not parsed.scheme or not parsed.netloc:
        return None

    host = parsed.netloc
    if host.endswith(".storage.supabase.co"):
        host = host.replace(".storage.supabase.co", ".supabase.co")

    return f"{parsed.scheme}://{host}/storage/v1/object/public/{bucket}"


def build_public_media_url(storage_key: str) -> str:
    """Return a browser-loadable URL for media object keys."""
    normalized_key = posixpath.normpath((storage_key or "").lstrip("/"))
    if not normalized_key or normalized_key == ".":
        return default_storage.url(storage_key)

    public_base = _supabase_public_base_url()
    if public_base:
        return f"{public_base}/{quote(normalized_key, safe='/')}"

    return default_storage.url(normalized_key)


def ensure_public_media_url(url: str) -> str:
    """Normalize known storage URLs/keys into a browser-loadable public URL."""
    if not url:
        return url

    key = extract_storage_key(url)
    if not key:
        return url

    return build_public_media_url(key)


def extract_storage_key(url: str) -> str | None:
    """Extract a relative storage key from a URL if it points to our managed uploads."""
    if not url:
        return None

    parsed = urlparse(url)
    if parsed.scheme and parsed.netloc:
        path = unquote(parsed.path or "")
    else:
        path = unquote(url)

    path = _strip_known_prefixes(path)

    # We only manage objects created through upload endpoints.
    if not path.startswith("uploads/"):
        return None

    return posixpath.normpath(path).lstrip("/")


def delete_storage_file_if_managed(url: str) -> bool:
    """Delete a storage object if URL maps to a managed key."""
    key = extract_storage_key(url)
    if not key:
        return False

    if default_storage.exists(key):
        default_storage.delete(key)
        return True
    return False
