from rest_framework import serializers
from .models import GalleryItem, Startup, NewsUpdate, TeamMember

class GallerySerializer(serializers.ModelSerializer):
    subtext = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = GalleryItem
        fields = ['id', 'image', 'subtext', 'created_at']


class StartupSerializer(serializers.ModelSerializer):
    website_url = serializers.URLField(required=False, allow_blank=True, allow_null=True, default=None)

    class Meta:
        model = Startup
        fields = ['id', 'name', 'description', 'logo_or_image', 'website_url', 'created_at']


class NewsUpdateSerializer(serializers.ModelSerializer):
    subtitle = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = NewsUpdate
        fields = ['id', 'title', 'subtitle', 'content', 'thumbnail', 'published_date']


class TeamMemberSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    bio = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = TeamMember
        fields = ['id', 'name', 'role', 'category', 'category_display', 'photo', 'bio', 'created_at']
