"""apps/accounts/serializers.py"""
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User, AuthToken, Address


# ── Token Output ──────────────────────────────────────────────────────────────

class AuthTokenSerializer(serializers.ModelSerializer):
    expires_in = serializers.SerializerMethodField()

    class Meta:
        model  = AuthToken
        fields = ["access_token", "refresh_token", "expires_in"]

    def get_expires_in(self, obj):
        from django.utils import timezone
        delta = obj.refresh_expires - timezone.now()
        return max(int(delta.total_seconds()), 0)


# ── User Serializers ──────────────────────────────────────────────────────────

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Address
        fields = ["id", "label", "line1", "line2", "city", "state", "pincode", "is_default"]
        read_only_fields = ["id"]


class UserPublicSerializer(serializers.ModelSerializer):
    """Safe read-only representation for tokens/auth responses."""
    addresses = AddressSerializer(many=True, read_only=True)

    class Meta:
        model  = User
        fields = [
            "id", "email", "name", "phone", "avatar",
            "role", "is_profile_complete", "addresses", "created_at",
        ]
        read_only_fields = fields


# ── Register ──────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    email            = serializers.EmailField()
    password         = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    role             = serializers.ChoiceField(
        choices=User.Role.choices, default=User.Role.CUSTOMER
    )

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(data["password"])
        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        return User.objects.create_user(
            email    = validated_data["email"],
            password = validated_data["password"],
            role     = validated_data.get("role", User.Role.CUSTOMER),
        )


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            request  = self.context.get("request"),
            username = data["email"].lower(),
            password = data["password"],
        )
        if not user:
            raise serializers.ValidationError({"non_field_errors": "Invalid email or password."})
        if not user.is_active:
            # Reactivate temporarily deactivated accounts on login
            if user.deletion_type == User.DeletionType.TEMPORARY:
                user.reactivate()
            else:
                raise serializers.ValidationError({"non_field_errors": "Account is inactive."})
        data["user"] = user
        return data


# ── Token Refresh ─────────────────────────────────────────────────────────────

class TokenRefreshSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()

    def validate_refresh_token(self, value):
        try:
            token = AuthToken.objects.select_related("user").get(refresh_token=value)
        except AuthToken.DoesNotExist:
            raise serializers.ValidationError("Invalid refresh token.")
        if not token.is_refresh_valid:
            raise serializers.ValidationError("Refresh token has expired. Please log in again.")
        self.instance = token
        return value


# ── Complete Profile ──────────────────────────────────────────────────────────

class CompleteProfileSerializer(serializers.Serializer):
    name    = serializers.CharField(max_length=150)
    phone   = serializers.CharField(max_length=20)
    address = AddressSerializer(required=False)

    def validate_phone(self, value):
        import re
        cleaned = re.sub(r"\s+", "", value)
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise serializers.ValidationError("Enter a valid 10-digit Indian mobile number.")
        return cleaned

    def update(self, instance, validated_data):
        address_data = validated_data.pop("address", None)
        instance.name   = validated_data["name"]
        instance.phone  = validated_data["phone"]
        instance.is_profile_complete = True
        instance.save(update_fields=["name", "phone", "is_profile_complete"])

        if address_data:
            address_data["is_default"] = True
            Address.objects.create(user=instance, **address_data)

        return instance


# ── Profile Update ────────────────────────────────────────────────────────────

class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["name", "phone", "avatar"]

    def validate_phone(self, value):
        import re
        cleaned = re.sub(r"\s+", "", value)
        if value and not re.match(r"^[6-9]\d{9}$", cleaned):
            raise serializers.ValidationError("Enter a valid 10-digit Indian mobile number.")
        return cleaned


# ── Account Deletion ──────────────────────────────────────────────────────────

class DeleteAccountSerializer(serializers.Serializer):
    type     = serializers.ChoiceField(choices=["temporary", "permanent"])
    password = serializers.CharField(write_only=True, required=False)

    def validate(self, data):
        user = self.context["request"].user
        # Permanent deletion requires password confirmation
        if data["type"] == "permanent":
            if not data.get("password"):
                raise serializers.ValidationError({"password": "Password required for permanent deletion."})
            if not user.check_password(data["password"]):
                raise serializers.ValidationError({"password": "Incorrect password."})
        return data
