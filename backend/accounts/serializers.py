"""
accounts/serializers.py

JWT token + user serializers.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


def get_user_permissions(user: User) -> list[str]:
    """Return a list of allowed navigation paths based on the user's role."""
    base_paths = ["/map", "/dashboard", "/settings"]
    role = user.role
    
    if role == "super_admin":
        return base_paths + ["/alerts", "/reports", "/admin"]
    elif role == "national_ops":
        return base_paths + ["/alerts", "/reports"]
    elif role == "county_officer":
        return base_paths + ["/alerts"]
    elif role == "responder":
        return base_paths + ["/alerts"]
    elif role == "analyst":
        return base_paths + ["/reports"]
    
    return base_paths

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT pair serializer to embed role, county_id,
    and display name into the access-token payload.
    The frontend can decode the token and know the user's role immediately
    without a separate /me/ round-trip.
    """

    @classmethod
    def get_token(cls, user: User):
        token = super().get_token(user)
        token["role"]      = user.role
        token["county_id"] = user.county_id
        token["name"]      = user.get_full_name() or user.username
        token["email"]     = user.email
        token["permissions"] = get_user_permissions(user)
        return token


class UserSerializer(serializers.ModelSerializer):
    """
    User profile info.
    GET   → returns profile
    PATCH → updates editable fields (first_name, last_name, phone, organization)
    """

    county_name = serializers.StringRelatedField(source="county", read_only=True)
    full_name   = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "email", "username",
            "first_name", "last_name", "full_name",
            "role", "county_id", "county_name",
            "phone", "organization", "permissions",
            "date_joined",
        ]
        read_only_fields = [
            "id", "email", "username", "full_name",
            "role", "county_id", "county_name", "permissions",
            "date_joined",
        ]

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username

    def get_permissions(self, obj: User) -> list[str]:
        return get_user_permissions(obj)


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change.
    Validates that the new passwords match.
    """
    current_password = serializers.CharField(required=True)
    new_password     = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        return attrs
