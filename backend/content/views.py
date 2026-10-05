from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from .models import GalleryItem, Startup, NewsUpdate, TeamMember, BackgroundVideo
from .serializers import (
    GallerySerializer,
    StartupSerializer,
    NewsUpdateSerializer,
    TeamMemberSerializer,
    BackgroundVideoSerializer,
)
from .mux_service import upload_video_to_mux, delete_mux_asset, MuxConfigurationError

VIDEO_EXTENSIONS = ('.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi')

class GalleryViewSet(viewsets.ModelViewSet):
    queryset = GalleryItem.objects.all()
    serializer_class = GallerySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_update(self, serializer):
        serializer.save(created_at=timezone.now())


class StartupViewSet(viewsets.ModelViewSet):
    queryset = Startup.objects.all()
    serializer_class = StartupSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_update(self, serializer):
        serializer.save(created_at=timezone.now())


class NewsUpdateViewSet(viewsets.ModelViewSet):
    queryset = NewsUpdate.objects.all()
    serializer_class = NewsUpdateSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_update(self, serializer):
        serializer.save(published_date=timezone.now().date())


class TeamMemberViewSet(viewsets.ModelViewSet):
    queryset = TeamMember.objects.all()
    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_update(self, serializer):
        serializer.save(created_at=timezone.now())

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class BackgroundVideoView(APIView):
    """
    Endpoint: /api/backgroundvideo/ & /api/background-video/
    GET: Returns current active background video streaming URL and metadata.
    POST: Uploads video file directly to Mux, cleans up previous Mux asset,
          and updates active background video in database.
    """
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        video = BackgroundVideo.objects.first()
        if not video:
            return Response({
                "id": None,
                "video_name": "No Background Video Active",
                "video_url": None,
                "thumbnail_url": None,
                "mux_playback_id": None,
                "updated_at": None,
            }, status=status.HTTP_200_OK)

        serializer = BackgroundVideoSerializer(video)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        file_obj = (
            request.FILES.get('videofile') or
            request.FILES.get('video_file') or
            request.FILES.get('file') or
            request.FILES.get('video')
        )

        if not file_obj:
            return Response(
                {"error": "A video file is required. Please attach a video under field 'videofile'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = (getattr(file_obj, 'content_type', '') or '').lower()
        if not content_type.startswith('video/') and not file_obj.name.lower().endswith(VIDEO_EXTENSIONS):
            return Response(
                {"error": "Unsupported file type. Please upload a video file (MP4, MOV, WEBM, MKV)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        video_name = (
            request.data.get('videoname') or
            request.data.get('video_name') or
            file_obj.name or
            'Main Background Video'
        )

        try:
            # Upload to Mux and receive streaming URL & playback ID
            mux_result = upload_video_to_mux(file_obj, filename=file_obj.name)
        except MuxConfigurationError as err:
            return Response({"error": str(err)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as err:
            return Response(
                {"error": f"Failed to upload video to Mux: {str(err)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Check existing background video to clean up and replace
        existing = BackgroundVideo.objects.first()
        previous_asset_id = existing.mux_asset_id if existing else None
        if existing:
            existing.video_name = video_name
            existing.video_url = mux_result['video_url']
            existing.thumbnail_url = mux_result.get('thumbnail_url')
            existing.mux_asset_id = mux_result.get('mux_asset_id')
            existing.mux_playback_id = mux_result.get('mux_playback_id')
            existing.save()
            instance = existing
        else:
            instance = BackgroundVideo.objects.create(
                video_name=video_name,
                video_url=mux_result['video_url'],
                thumbnail_url=mux_result.get('thumbnail_url'),
                mux_asset_id=mux_result.get('mux_asset_id'),
                mux_playback_id=mux_result.get('mux_playback_id'),
            )

        # Only remove the previous Mux asset once the new one is saved, so a
        # failed save never leaves the site without a playable video.
        if previous_asset_id and previous_asset_id != instance.mux_asset_id:
            delete_mux_asset(previous_asset_id)

        serializer = BackgroundVideoSerializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)