from django.conf import settings
from django.utils.cache import patch_vary_headers


class ApiCacheHeadersMiddleware:
    """
    Sets Cache-Control on /api/ reads. Anonymous 200 responses may be reused by
    the browser for a short while (and revalidated with the ETag that
    ConditionalGetMiddleware adds); anything sent with credentials or that
    failed is never stored. Views that set Cache-Control themselves keep it.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.method not in ('GET', 'HEAD') or not request.path.startswith('/api/'):
            return response

        if not response.has_header('Cache-Control'):
            if request.META.get('HTTP_AUTHORIZATION') or response.status_code != 200:
                response['Cache-Control'] = 'private, no-store'
            else:
                # No stale-while-revalidate: the site's own cache already does
                # that, and stacking both would delay CMS edits by minutes.
                response['Cache-Control'] = f'public, max-age={settings.API_BROWSER_MAX_AGE}'
        # Keep the browser from answering a CMS (authenticated) request with a
        # copy it stored for an anonymous one.
        patch_vary_headers(response, ('Authorization',))
        return response
