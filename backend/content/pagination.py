from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Default 20 per page; clients may ask for up to 100 with ?page_size=N so
    the public site can load a whole section in a single request."""

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
