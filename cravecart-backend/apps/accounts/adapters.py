from __future__ import annotations

from typing import Any

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


def _non_empty_string(value: Any) -> str:
    return str(value).strip() if value else ""


def _extract_google_profile_data(sociallogin) -> dict[str, str]:
    account = getattr(sociallogin, "account", None)
    extra_data = getattr(account, "extra_data", {}) or {}

    name = _non_empty_string(
        extra_data.get("name")
        or " ".join(
            part
            for part in [
                _non_empty_string(extra_data.get("given_name")),
                _non_empty_string(extra_data.get("family_name")),
            ]
            if part
        )
    )
    avatar = _non_empty_string(extra_data.get("picture"))
    phone = _non_empty_string(
        extra_data.get("phone_number")
        or extra_data.get("phone")
        or extra_data.get("mobile")
    )
    address = _non_empty_string(
        extra_data.get("formatted_address")
        or extra_data.get("address")
    )
    google_id = _non_empty_string(getattr(account, "uid", ""))

    return {
        "name": name,
        "avatar": avatar,
        "phone": phone,
        "address": address,
        "google_id": google_id,
    }


def sync_google_profile(user, sociallogin) -> dict[str, str]:
    profile = _extract_google_profile_data(sociallogin)
    update_fields: list[str] = []

    if profile["google_id"] and user.google_id != profile["google_id"]:
        user.google_id = profile["google_id"]
        update_fields.append("google_id")

    if profile["name"] and not user.name:
        user.name = profile["name"]
        update_fields.append("name")

    if profile["avatar"] and not user.avatar:
        user.avatar = profile["avatar"]
        update_fields.append("avatar")

    if profile["phone"] and not user.phone:
        user.phone = profile["phone"]
        update_fields.append("phone")

    if update_fields:
        user.save(update_fields=update_fields)

    return profile


class CraveCartSocialAccountAdapter(DefaultSocialAccountAdapter):
    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        profile = _extract_google_profile_data(sociallogin)

        if profile["name"] and not getattr(user, "name", ""):
            user.name = profile["name"]
        if profile["avatar"] and not getattr(user, "avatar", ""):
            user.avatar = profile["avatar"]
        if profile["phone"] and not getattr(user, "phone", ""):
            user.phone = profile["phone"]
        if profile["google_id"] and not getattr(user, "google_id", ""):
            user.google_id = profile["google_id"]

        return user

    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form=form)
        sync_google_profile(user, sociallogin)
        return user

    def pre_social_login(self, request, sociallogin):
        super().pre_social_login(request, sociallogin)
        if getattr(sociallogin, "is_existing", False):
            sync_google_profile(sociallogin.user, sociallogin)
