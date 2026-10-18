"""
Server-side cache for the public read API.

Responses are kept in the process-local cache (LocMemCache, see settings.CACHES),
so gunicorn must run a single worker for every request to see the same cache.

Each resource has a version token that is part of every cache key. Saving or
deleting a record replaces its token (see signals.py), so cached responses for
that resource are never served again. Entries also expire after API_CACHE_TTL
so writes made outside this process (management commands, the Neon console)
still show up within that window.
"""
import time

from django.conf import settings
from django.core.cache import cache
from rest_framework.response import Response

GALLERY = 'gallery'
STARTUPS = 'startups'
NEWS = 'news'
TEAM = 'team'
BACKGROUND_VIDEO = 'background-video'
ALL_RESOURCES = (GALLERY, STARTUPS, NEWS, TEAM, BACKGROUND_VIDEO)


def _version_key(resource):
    return f'content-version:{resource}'


def get_version(resource):
    # A missing token (first use, restart or eviction) gets a new unique value,
    # so it can never match responses cached under an earlier one.
    return cache.get_or_set(_version_key(resource), time.time_ns, timeout=None)


def bump_version(resource):
    cache.set(_version_key(resource), time.time_ns(), timeout=None)


def is_cacheable(request):
    # Requests carrying credentials (the CMS) always read live data.
    return request.method in ('GET', 'HEAD') and not request.META.get('HTTP_AUTHORIZATION')


def cached_response(request, resources, build, name=None):
    """
    Returns build() for anonymous reads, from the cache when possible.

    `resources` are the resources the response depends on; `name` identifies
    the response and defaults to the full request URL (including the query).
    Only 200 responses are stored.
    """
    if not is_cacheable(request):
        return build()

    # Read the versions before building: if a write lands mid-build, the result
    # is stored under the old versions and never served afterwards.
    versions = '.'.join(str(get_version(r)) for r in resources)
    key = f'api-response:{versions}:{name or request.build_absolute_uri()}'

    data = cache.get(key)
    if data is not None:
        return Response(data, headers={'X-Cache': 'HIT'})

    response = build()
    if response.status_code == 200:
        cache.set(key, response.data, settings.API_CACHE_TTL)
    response['X-Cache'] = 'MISS'
    return response


class CachedReadMixin:
    """Serves list and retrieve for anonymous requests from the cache."""

    cache_resource = None

    def list(self, request, *args, **kwargs):
        parent = super().list
        return cached_response(request, (self.cache_resource,), lambda: parent(request, *args, **kwargs))

    def retrieve(self, request, *args, **kwargs):
        parent = super().retrieve
        return cached_response(request, (self.cache_resource,), lambda: parent(request, *args, **kwargs))
