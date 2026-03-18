"""
accounts/views.py

JWT auth endpoints:
  POST /api/auth/login/   → access + refresh tokens
  POST /api/auth/refresh/ → new access token (handled by simplejwt default view)
  POST /api/auth/logout/  → blacklist the refresh token
  GET  /api/auth/me/      → authenticated user profile
  GET/POST/DELETE /api/auth/totp/setup/   → TOTP enrollment
  POST /api/auth/totp/confirm/            → exchange partial token + TOTP code for full JWT
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
import secrets

from .serializers import MyTokenObtainPairSerializer, UserSerializer, ChangePasswordSerializer
from api.models import AuditLog


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Body: { "email": "...", "password": "..." }
    Returns: { "access": "...", "refresh": "..." }

    The access token payload includes: role, county_id, name, email.
    If TOTP is enabled for the user, returns { requires_totp: true, partial_token: "..." }
    instead of the full JWT pair.
    """
    serializer_class = MyTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            serializer = self.get_serializer(data=request.data)
            try:
                serializer.is_valid(raise_exception=False)
                user = serializer.user
                if user:
                    # Session audit
                    AuditLog.objects.create(
                        user=user, action="login", resource_type="",
                        resource_id=None,
                        metadata={"ip": request.META.get("REMOTE_ADDR")},
                    )
                    # TOTP gate: if user has active TOTP, return partial token
                    if hasattr(user, 'totp_device') and user.totp_device.is_active:
                        signer = TimestampSigner()
                        partial = signer.sign(f"totp:{user.pk}")
                        return Response({'requires_totp': True, 'partial_token': partial}, status=200)
            except Exception:
                pass  # Never block login due to audit or TOTP check failure
        return response


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
    GET   → Returns the authenticated user's profile.
    PATCH → Updates the authenticated user's profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Body: { "current_password": "...", "new_password": "...", "confirm_password": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.data.get("current_password")):
                return Response({"current_password": ["Incorrect current password."]}, status=400)

            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response({"detail": "Password changed successfully."})
        return Response(serializer.errors, status=400)


# ── TOTP endpoints ────────────────────────────────────────────────────────────

class TOTPSetupView(APIView):
    """
    GET  /api/auth/totp/setup/   → generate new secret, return provisioning_uri
    POST /api/auth/totp/setup/   → verify code and activate TOTP
    DELETE /api/auth/totp/setup/ → disable TOTP
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import pyotp
        from .models import TOTPDevice
        is_active = request.user.totp_enabled
        # Generate a new secret (don't save yet — only used if user proceeds with enroll)
        secret = pyotp.random_base32()
        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=request.user.email, issuer_name='CrisisLens GOK')
        # Store secret in session temporarily
        request.session['totp_pending_secret'] = secret
        return Response({'secret': secret, 'provisioning_uri': uri, 'uri': uri, 'is_active': is_active})

    def post(self, request):
        from .models import TOTPDevice
        code = request.data.get('code', '')
        secret = request.session.get('totp_pending_secret')
        if not secret:
            return Response({'detail': 'No pending TOTP setup. Call GET first.'}, status=400)
        import pyotp
        totp = pyotp.TOTP(secret)
        if not totp.verify(code.strip(), valid_window=1):
            return Response({'detail': 'Invalid code. Check your authenticator app.'}, status=400)
        # Generate backup codes
        backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]
        device, _ = TOTPDevice.objects.get_or_create(user=request.user)
        device.secret = secret
        device.is_active = True
        device.backup_codes = backup_codes
        device.save()
        del request.session['totp_pending_secret']
        return Response({'enabled': True, 'backup_codes': backup_codes})

    def delete(self, request):
        from .models import TOTPDevice
        code = request.data.get('code', '')
        try:
            device = request.user.totp_device
        except Exception:
            return Response({'detail': 'TOTP not enabled'}, status=400)
        if not device.verify_code(code):
            return Response({'detail': 'Invalid TOTP code'}, status=400)
        device.is_active = False
        device.save()
        return Response({'disabled': True})


class TOTPConfirmView(APIView):
    """
    POST /api/auth/totp/confirm/
    Body: { partial_token, code }
    Exchanges a partial login token + TOTP code for full JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import TOTPDevice
        from accounts.models import User
        partial_token = request.data.get('partial_token', '')
        code = request.data.get('code', '').strip()
        if not partial_token or not code:
            return Response({'detail': 'partial_token and code are required.'}, status=400)
        signer = TimestampSigner()
        try:
            value = signer.unsign(partial_token, max_age=300)  # 5 min
            _, user_pk = value.split(':', 1)
            user = User.objects.get(pk=int(user_pk))
        except (BadSignature, SignatureExpired, ValueError, User.DoesNotExist):
            return Response({'detail': 'Invalid or expired partial token.'}, status=400)
        try:
            if not user.totp_device.verify_code(code):
                return Response({'detail': 'Invalid TOTP code.'}, status=400)
        except Exception:
            return Response({'detail': 'TOTP not configured for this user.'}, status=400)
        # Issue full JWT
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        # Add custom claims (same as MyTokenObtainPairSerializer)
        from .serializers import MyTokenObtainPairSerializer
        access['role'] = user.role
        access['county_id'] = user.county_id
        access['name'] = user.get_full_name() or user.email
        access['email'] = user.email
        return Response({
            'access': str(access),
            'refresh': str(refresh),
            'user': {'id': user.pk, 'email': user.email, 'role': user.role,
                     'name': user.get_full_name() or user.email,
                     'county_id': user.county_id},
        })
