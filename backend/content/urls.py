# apps/cms/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GalleryViewSet, StartupViewSet, NewsUpdateViewSet, TeamMemberViewSet

router = DefaultRouter()
router.register(r'gallery', GalleryViewSet, basename='gallery')
router.register(r'startups', StartupViewSet, basename='startup')
router.register(r'news', NewsUpdateViewSet, basename='news')
router.register(r'team', TeamMemberViewSet, basename='team')

urlpatterns = [
    path('', include(router.urls)),
]