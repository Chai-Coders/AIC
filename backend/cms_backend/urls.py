"""
URL configuration for cms_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from content.views import BackgroundVideoView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('content.urls')),
    path('backgroundvideo/', BackgroundVideoView.as_view(), name='root_background_video_compact'),
    path('backgroundvideo', BackgroundVideoView.as_view(), name='root_background_video_compact_noslash'),
    path('background-video/', BackgroundVideoView.as_view(), name='root_background_video_hyphen'),
    path('background-video', BackgroundVideoView.as_view(), name='root_background_video_hyphen_noslash'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)