from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser')
        read_only_fields = fields


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that validates credentials,
    ensures the user has staff or admin privileges for CMS management,
    and includes user profile information directly in the response payload.
    """
    def validate(self, attrs):
        data = super().validate(attrs)

        if not self.user.is_staff and not self.user.is_superuser:
            raise serializers.ValidationError({
                "detail": "Access restricted. Only staff and administrators are permitted to log in."
            })

        data['user'] = UserSerializer(self.user).data
        return data


class LogoutSerializer(serializers.Serializer):
    """
    Serializer to accept and blacklist a refresh token on logout.
    """
    refresh = serializers.CharField(required=True)

    def validate(self, attrs):
        self.token = attrs['refresh']
        return attrs

    def save(self, **kwargs):
        try:
            RefreshToken(self.token).blacklist()
        except TokenError as exc:
            raise serializers.ValidationError({"detail": str(exc)})
