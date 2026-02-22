"""
api/permissions.py

Role-based DRF permission classes.
Set-based role checks — no conditionals duplicated across views.

Role hierarchy (each set includes those above it):
  super_admin > national_ops > county_officer > responder
  super_admin > national_ops > analyst
"""
from rest_framework.permissions import BasePermission

# Role sets — extending upward so higher roles always have access
_SUPER = {"super_admin"}
_NAT   = {"national_ops"} | _SUPER
_CO    = {"county_officer"} | _NAT
_RESP  = {"responder"} | _CO
_ANA   = {"analyst"} | _NAT


def _role(request) -> str | None:
    """Safely extract role from authenticated user."""
    return getattr(request.user, "role", None)


class IsNationalOps(BasePermission):
    """Grants access to national_ops and super_admin."""
    message = "National Operations or Super Admin role required."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated and _role(request) in _NAT


class IsCountyOfficer(BasePermission):
    """Grants access to county_officer, national_ops, super_admin."""
    message = "County Officer role or above required."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated and _role(request) in _CO


class IsResponder(BasePermission):
    """Grants access to responder and above."""
    message = "Responder role or above required."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated and _role(request) in _RESP


class IsAnalyst(BasePermission):
    """Grants access to analyst, national_ops, super_admin."""
    message = "Analyst role required."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated and _role(request) in _ANA


class IsCountyMember(BasePermission):
    """
    Object-level permission: user's county matches the resource county,
    OR the user has national-level access (national_ops / super_admin).
    Use as a secondary permission alongside IsCountyOfficer.
    """
    message = "You do not have access to resources outside your assigned county."

    def has_object_permission(self, request, view, obj) -> bool:
        if _role(request) in _NAT:
            return True
        user_county = getattr(request.user, "county_id", None)
        obj_county  = getattr(obj, "county_id", None)
        return user_county is not None and user_county == obj_county
