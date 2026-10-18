from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from . import cache
from .models import BackgroundVideo, GalleryItem, NewsUpdate, Startup, TeamMember

MODEL_RESOURCES = {
    GalleryItem: cache.GALLERY,
    Startup: cache.STARTUPS,
    NewsUpdate: cache.NEWS,
    TeamMember: cache.TEAM,
    BackgroundVideo: cache.BACKGROUND_VIDEO,
}


@receiver([post_save, post_delete])
def invalidate_cached_responses(sender, **kwargs):
    resource = MODEL_RESOURCES.get(sender)
    if resource is None:
        return
    # Bump now, and again once the transaction commits: a request that rebuilds
    # the cache before the commit still reads the old rows, and the second bump
    # discards that copy.
    cache.bump_version(resource)
    transaction.on_commit(lambda: cache.bump_version(resource))
