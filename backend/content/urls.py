from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    GalleryViewSet,
    StartupViewSet,
    NewsUpdateViewSet,
    TeamMemberViewSet,
    BackgroundVideoView,
)
from .auth_views import CustomTokenObtainPairView, CurrentUserView, LogoutView

router = DefaultRouter()
router.register(r'gallery', GalleryViewSet, basename='gallery')
router.register(r'startups', StartupViewSet, basename='startup')
router.register(r'news', NewsUpdateViewSet, basename='news')
router.register(r'team', TeamMemberViewSet, basename='team')

auth_urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
]

urlpatterns = [
    path('auth/', include(auth_urlpatterns)),
    # Background Video Endpoints (both naming styles)
    path('backgroundvideo/', BackgroundVideoView.as_view(), name='background_video_compact'),
    path('backgroundvideo', BackgroundVideoView.as_view(), name='background_video_compact_noslash'),
    path('background-video/', BackgroundVideoView.as_view(), name='background_video_hyphen'),
    path('background-video', BackgroundVideoView.as_view(), name='background_video_hyphen_noslash'),
    path('', include(router.urls)),
]