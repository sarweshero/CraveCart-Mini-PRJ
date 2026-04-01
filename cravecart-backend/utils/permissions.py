from rest_framework.permissions import BasePermission

class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "customer"

class IsHotelAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user.is_authenticated and request.user.role == "hotel_admin"):
            return False
        return hasattr(request.user, "restaurant")

class IsProfileComplete(BasePermission):
    message = "Please complete your profile to access this feature."
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_profile_complete


class IsDeliveryPartner(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "delivery_partner"
