from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .auth_serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    LogoutSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint for CMS administrators.
    Accepts `username` and `password`, returns `access`, `refresh`, and `user` payload.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class CurrentUserView(APIView):
    """
    Returns the profile and permissions of the currently authenticated user.
    Used by frontend applications to verify session validity and check admin status.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Blacklists the provided refresh token to securely log the user out.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Successfully logged out and token invalidated."},
            status=status.HTTP_200_OK
        )
