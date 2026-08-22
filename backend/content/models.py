from django.db import models

class GalleryItem(models.Model):
    image = models.ImageField(upload_to='gallery/')
    subtext = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Gallery Item'
        verbose_name_plural = 'Gallery Items'

    def __str__(self):
        return self.subtext or f"Gallery Item {self.id}"


class Startup(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    logo_or_image = models.ImageField(upload_to='startups/')
    website_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Startup'
        verbose_name_plural = 'Startups'

    def __str__(self):
        return self.name


class NewsUpdate(models.Model):
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=300, blank=True)
    content = models.TextField()
    thumbnail = models.ImageField(upload_to='news/')
    published_date = models.DateField(auto_now_add=True)

    class Meta:
        ordering = ['-published_date']
        verbose_name = 'News Update'
        verbose_name_plural = 'News Updates'

    def __str__(self):
        return self.title


class TeamMember(models.Model):
    CATEGORY_CHOICES = [
        ('mentor', 'International Mentor'),
        ('team', 'AIC Team'),
        ('governor', 'Board of Governors'),
    ]
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    photo = models.ImageField(upload_to='team/')
    bio = models.TextField(blank=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Team Member'
        verbose_name_plural = 'Team Members'

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"