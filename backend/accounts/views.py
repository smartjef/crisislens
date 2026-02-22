"""
accounts/views.py

JWT auth endpoints:
  POST /api/auth/login/   → access + refresh tokens
  POST /api/auth/refresh/ → new access token (handled by simplejwt default view)
  POST /api/auth/logout/  → blacklist the refresh token
  GET  /api/auth/me/      → authenticated user profile
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import MyTokenObtainPairSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Body: { "email": "...", "password": "..." }
    Returns: { "access": "...", "refresh": "..." }

    The access token payload includes: role, county_id, name, email.
    """
    serializer_class = MyTokenObtainPairSerializer


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Body: { "refresh": "<refresh_token>" }
    Blacklists the refresh token so it can never be used again.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass  # Already blacklisted or invalid — still return 200
        return Response({"detail": "Successfully logged out."})


class MeView(APIView):
    """
    GET /api/auth/me/
    Returns the authenticated user's profile.
    Requires: Authorization: Bearer <access_token>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
