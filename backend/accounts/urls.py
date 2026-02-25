"""
accounts/urls.py  →  mounted at /api/auth/ in crisislens/urls.py
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LoginView, LogoutView, MeView, ChangePasswordView

urlpatterns = [
    path("login/",           LoginView.as_view(),          name="auth_login"),
    path("refresh/",         TokenRefreshView.as_view(),   name="auth_refresh"),
    path("logout/",          LogoutView.as_view(),         name="auth_logout"),
    path("me/",              MeView.as_view(),             name="auth_me"),
    path("change-password/", ChangePasswordView.as_view(), name="auth_change_password"),
]
