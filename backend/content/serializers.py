from rest_framework import serializers
from .models import GalleryItem, Startup, NewsUpdate, TeamMember

class GallerySerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryItem
        fields = ['id', 'image', 'subtext', 'created_at']


class StartupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Startup
        fields = ['id', 'name', 'description', 'logo_or_image', 'website_url', 'created_at']


class NewsUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsUpdate
        fields = ['id', 'title', 'subtitle', 'content', 'thumbnail', 'published_date']


class TeamMemberSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = TeamMember
        fields = ['id', 'name', 'role', 'category', 'category_display', 'photo', 'bio']
