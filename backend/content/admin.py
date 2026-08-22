from django.contrib import admin
from django.utils.html import format_html
from .models import GalleryItem, Startup, NewsUpdate, TeamMember

@admin.register(GalleryItem)
class GalleryItemAdmin(admin.ModelAdmin):
    list_display = ('image_preview', 'subtext', 'created_at')
    search_fields = ('subtext',)
    readonly_fields = ('created_at', 'image_preview_large')
    fields = ('image', 'image_preview_large', 'subtext', 'created_at')

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />', obj.image.url)
        return "-"
    image_preview.short_description = "Preview"

    def image_preview_large(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-width: 300px; max-height: 300px; border-radius: 6px;" />', obj.image.url)
        return "No image uploaded yet"
    image_preview_large.short_description = "Current Image Preview"


@admin.register(Startup)
class StartupAdmin(admin.ModelAdmin):
    list_display = ('logo_preview', 'name', 'website_url', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'logo_preview_large')
    fields = ('name', 'description', 'logo_or_image', 'logo_preview_large', 'website_url', 'created_at')

    def logo_preview(self, obj):
        if obj.logo_or_image:
            return format_html('<img src="{}" style="width: 50px; height: 50px; object-fit: contain; border-radius: 4px;" />', obj.logo_or_image.url)
        return "-"
    logo_preview.short_description = "Logo"

    def logo_preview_large(self, obj):
        if obj.logo_or_image:
            return format_html('<img src="{}" style="max-width: 250px; max-height: 250px; object-fit: contain; border-radius: 6px;" />', obj.logo_or_image.url)
        return "No image uploaded yet"
    logo_preview_large.short_description = "Current Logo Preview"


@admin.register(NewsUpdate)
class NewsUpdateAdmin(admin.ModelAdmin):
    list_display = ('thumbnail_preview', 'title', 'published_date')
    search_fields = ('title', 'subtitle', 'content')
    readonly_fields = ('published_date', 'thumbnail_preview_large')
    fields = ('title', 'subtitle', 'content', 'thumbnail', 'thumbnail_preview_large', 'published_date')

    def thumbnail_preview(self, obj):
        if obj.thumbnail:
            return format_html('<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />', obj.thumbnail.url)
        return "-"
    thumbnail_preview.short_description = "Thumbnail"

    def thumbnail_preview_large(self, obj):
        if obj.thumbnail:
            return format_html('<img src="{}" style="max-width: 300px; max-height: 300px; border-radius: 6px;" />', obj.thumbnail.url)
        return "No thumbnail uploaded yet"
    thumbnail_preview_large.short_description = "Current Thumbnail Preview"


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('photo_preview', 'name', 'role', 'category')
    list_filter = ('category',)
    search_fields = ('name', 'role', 'bio')
    readonly_fields = ('photo_preview_large',)
    fields = ('name', 'role', 'category', 'photo', 'photo_preview_large', 'bio')

    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 50%;" />', obj.photo.url)
        return "-"
    photo_preview.short_description = "Photo"

    def photo_preview_large(self, obj):
        if obj.photo:
            return format_html('<img src="{}" style="max-width: 250px; max-height: 250px; object-fit: cover; border-radius: 8px;" />', obj.photo.url)
        return "No photo uploaded yet"
    photo_preview_large.short_description = "Current Photo Preview"