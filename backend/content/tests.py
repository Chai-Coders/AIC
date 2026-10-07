import io
import os
import tempfile
from unittest import mock
from PIL import Image
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.contrib import admin
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.cache import cache
from rest_framework.test import APITestCase as DRFAPITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status

from .models import GalleryItem, Startup, NewsUpdate, TeamMember, BackgroundVideo

User = get_user_model()


class APITestCase(DRFAPITestCase):
    def setUp(self):
        super().setUp()
        # The in-memory API cache outlives each test's database rollback.
        cache.clear()


def generate_test_image(name='test.png'):
    file_obj = io.BytesIO()
    image = Image.new('RGB', (100, 100), color=(73, 109, 137))
    image.save(file_obj, format='PNG')
    file_obj.seek(0)
    return SimpleUploadedFile(name, file_obj.read(), content_type='image/png')


class ModelTests(TestCase):
    def test_gallery_item_str(self):
        item = GalleryItem.objects.create(
            image=generate_test_image('gallery1.png'),
            subtext="Annual Summit 2026"
        )
        self.assertEqual(str(item), "Annual Summit 2026")

        item_no_subtext = GalleryItem.objects.create(
            image=generate_test_image('gallery2.png'),
            subtext=""
        )
        self.assertEqual(str(item_no_subtext), f"Gallery Item {item_no_subtext.id}")

    def test_startup_str(self):
        startup = Startup.objects.create(
            name="Quantum Leap Labs",
            description="Next-gen AI solutions",
            logo_or_image=generate_test_image('startup1.png'),
            website_url="https://quantumleap.example.com"
        )
        self.assertEqual(str(startup), "Quantum Leap Labs")

    def test_news_update_str(self):
        news = NewsUpdate.objects.create(
            title="Incubation Cohort 4 Launched",
            subtitle="15 startups selected",
            content="Full announcement details here...",
            thumbnail=generate_test_image('news1.png')
        )
        self.assertEqual(str(news), "Incubation Cohort 4 Launched")

    def test_team_member_str(self):
        member = TeamMember.objects.create(
            name="Dr. Evelyn Vance",
            role="Lead Technical Mentor",
            category="mentor",
            photo=generate_test_image('mentor1.png'),
            bio="Seasoned deep tech mentor."
        )
        self.assertEqual(str(member), "Dr. Evelyn Vance (International Mentor)")


class APITests(APITestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            username='staff_user',
            password='secretpassword123',
            is_staff=True
        )

        self.gallery_item = GalleryItem.objects.create(
            image=generate_test_image('g1.png'),
            subtext="Robotics Lab Opening"
        )
        self.startup = Startup.objects.create(
            name="NeuralPulse",
            description="MedTech AI diagnostics",
            logo_or_image=generate_test_image('s1.png'),
            website_url="https://neuralpulse.example.com"
        )
        self.news = NewsUpdate.objects.create(
            title="New Grant Awarded",
            subtitle="Supported by Innovation Fund",
            content="Detailed news article body...",
            thumbnail=generate_test_image('n1.png')
        )
        self.mentor = TeamMember.objects.create(
            name="Dr. Alan Turing",
            role="AI Advisor",
            category="mentor",
            photo=generate_test_image('t1.png'),
            bio="Computing pioneer."
        )
        self.staff_member = TeamMember.objects.create(
            name="Sarah Jenkins",
            role="Program Manager",
            category="team",
            photo=generate_test_image('t2.png'),
            bio="Operations lead."
        )

    def test_public_get_endpoints(self):
        # Gallery endpoint
        response = self.client.get('/api/gallery/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['subtext'], "Robotics Lab Opening")
        self.assertIn('/media/gallery/', results[0]['image'])

        # Startups endpoint
        response = self.client.get('/api/startups/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "NeuralPulse")

        # News endpoint
        response = self.client.get('/api/news/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], "New Grant Awarded")

        # Team endpoint
        response = self.client.get('/api/team/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)

    def test_team_category_filter(self):
        # Filter for mentors
        response = self.client.get('/api/team/?category=mentor')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Dr. Alan Turing")
        self.assertEqual(results[0]['category_display'], "International Mentor")

        # Filter for team members
        response = self.client.get('/api/team/?category=team')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Sarah Jenkins")
        self.assertEqual(results[0]['category_display'], "AIC Team")

    def test_unauthenticated_write_blocked(self):
        payload = {
            'subtext': 'Unauthorized item',
            'image': generate_test_image('unauth.png')
        }
        response = self.client.post('/api/gallery/', payload, format='multipart')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_authenticated_write_allowed(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'subtext': 'Authorized gallery creation',
            'image': generate_test_image('auth.png')
        }
        response = self.client.post('/api/gallery/', payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(GalleryItem.objects.count(), 2)


class JWTAuthenticationTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.admin_user = User.objects.create_superuser(
            username='super_admin',
            email='admin@aic.org',
            password='AdminPassword123!'
        )
        self.staff_user = User.objects.create_user(
            username='staff_editor',
            email='staff@aic.org',
            password='StaffPassword123!',
            is_staff=True
        )
        self.regular_user = User.objects.create_user(
            username='regular_visitor',
            email='visitor@example.com',
            password='VisitorPassword123!',
            is_staff=False
        )

    def test_staff_login_success(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'staff_editor',
            'password': 'StaffPassword123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'staff_editor')
        self.assertTrue(response.data['user']['is_staff'])

    def test_superuser_login_success(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'super_admin',
            'password': 'AdminPassword123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertTrue(response.data['user']['is_superuser'])

    def test_non_staff_login_rejected(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'regular_visitor',
            'password': 'VisitorPassword123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)

    def test_invalid_credentials_rejected(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'staff_editor',
            'password': 'WrongPasswordXYZ'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        login_res = self.client.post('/api/auth/login/', {
            'username': 'staff_editor',
            'password': 'StaffPassword123!'
        }, format='json')
        refresh_token = login_res.data['refresh']

        refresh_res = self.client.post('/api/auth/refresh/', {
            'refresh': refresh_token
        }, format='json')

        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh_res.data)

    def test_current_user_me_endpoint_authenticated(self):
        login_res = self.client.post('/api/auth/login/', {
            'username': 'staff_editor',
            'password': 'StaffPassword123!'
        }, format='json')
        access_token = login_res.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        me_res = self.client.get('/api/auth/me/')

        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertEqual(me_res.data['username'], 'staff_editor')
        self.assertEqual(me_res.data['email'], 'staff@aic.org')
        self.assertTrue(me_res.data['is_staff'])

    def test_current_user_me_endpoint_unauthenticated(self):
        me_res = self.client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jwt_bearer_header_content_mutation(self):
        # 1. Obtain JWT access token
        login_res = self.client.post('/api/auth/login/', {
            'username': 'staff_editor',
            'password': 'StaffPassword123!'
        }, format='json')
        access_token = login_res.data['access']

        # 2. Use token in HTTP Authorization header to mutate content
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        payload = {
            'subtext': 'Bearer Token Authorized Gallery Upload',
            'image': generate_test_image('bearer_upload.png')
        }
        create_res = self.client.post('/api/gallery/', payload, format='multipart')

        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(GalleryItem.objects.filter(subtext='Bearer Token Authorized Gallery Upload').count(), 1)

    def test_logout_and_token_blacklist(self):
        login_res = self.client.post('/api/auth/login/', {
            'username': 'staff_editor',
            'password': 'StaffPassword123!'
        }, format='json')
        access_token = login_res.data['access']
        refresh_token = login_res.data['refresh']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_res = self.client.post('/api/auth/logout/', {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # After blacklisting, attempting to refresh with that token should fail
        refresh_attempt = self.client.post('/api/auth/refresh/', {
            'refresh': refresh_token
        }, format='json')
        self.assertEqual(refresh_attempt.status_code, status.HTTP_401_UNAUTHORIZED)


    def test_logout_works_with_expired_or_missing_access_token(self):
        login_res = self.client.post('/api/auth/login/', {
            'username': 'staff_editor',
            'password': 'StaffPassword123!'
        }, format='json')
        refresh_token = login_res.data['refresh']

        # No Authorization header at all (e.g. access token already expired client-side)
        self.client.credentials()
        logout_res = self.client.post('/api/auth/logout/', {'refresh': refresh_token}, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        refresh_attempt = self.client.post('/api/auth/refresh/', {'refresh': refresh_token}, format='json')
        self.assertEqual(refresh_attempt.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotates_and_returns_new_refresh_token(self):
        login_res = self.client.post('/api/auth/login/', {
            'username': 'staff_editor',
            'password': 'StaffPassword123!'
        }, format='json')
        refresh_res = self.client.post('/api/auth/refresh/', {'refresh': login_res.data['refresh']}, format='json')
        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertIn('refresh', refresh_res.data)
        self.assertNotEqual(refresh_res.data['refresh'], login_res.data['refresh'])

        # The old refresh token is blacklisted after rotation, so clients must store the new one
        reuse_res = self.client.post('/api/auth/refresh/', {'refresh': login_res.data['refresh']}, format='json')
        self.assertEqual(reuse_res.status_code, status.HTTP_401_UNAUTHORIZED)


class BackgroundVideoAPITests(APITestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_superuser(username='video_admin', password='VideoPass123!', email='v@aic.org')

    def test_get_without_video_returns_placeholder(self):
        res = self.client.get('/api/backgroundvideo/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data['id'])
        self.assertIsNone(res.data['video_url'])

    def test_upload_requires_authentication(self):
        video = SimpleUploadedFile('clip.mp4', b'fake', content_type='video/mp4')
        res = self.client.post('/api/backgroundvideo/', {'videofile': video}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_rejects_non_video_files(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/backgroundvideo/', {'videofile': generate_test_image('not_video.png')}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_without_mux_credentials_returns_503(self):
        self.client.force_authenticate(self.admin)
        video = SimpleUploadedFile('clip.mp4', b'fake', content_type='video/mp4')
        with mock.patch.dict(os.environ, {'MUX_TOKEN_ID': '', 'MUX_TOKEN_SECRET': ''}):
            res = self.client.post('/api/backgroundvideo/', {'videofile': video}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_upload_replaces_video_and_deletes_previous_asset_after_save(self):
        BackgroundVideo.objects.create(
            video_name='Old', video_url='https://stream.mux.com/old.m3u8',
            mux_asset_id='old-asset', mux_playback_id='old',
        )
        self.client.force_authenticate(self.admin)
        mux_result = {
            'mux_asset_id': 'new-asset', 'mux_playback_id': 'new',
            'video_url': 'https://stream.mux.com/new.m3u8',
            'thumbnail_url': 'https://image.mux.com/new/thumbnail.jpg',
        }
        video = SimpleUploadedFile('clip.mp4', b'fake', content_type='video/mp4')
        with mock.patch('content.views.upload_video_to_mux', return_value=mux_result), \
                mock.patch('content.views.delete_mux_asset') as delete_mock:
            res = self.client.post('/api/backgroundvideo/', {'videofile': video, 'videoname': 'Hero'}, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['video_name'], 'Hero')
        self.assertEqual(BackgroundVideo.objects.count(), 1)
        self.assertEqual(BackgroundVideo.objects.get().mux_asset_id, 'new-asset')
        delete_mock.assert_called_once_with('old-asset')


class ManagementCommandTests(TestCase):
    def test_createsuperuser_if_not_exists_creates_new(self):
        call_command(
            'createsuperuser_if_not_exists',
            username='cmd_admin',
            password='CmdPassword123!',
            email='cmd@aic.org'
        )
        user = User.objects.get(username='cmd_admin')
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password('CmdPassword123!'))

    def test_createsuperuser_if_not_exists_skips_existing(self):
        # Create first time
        call_command(
            'createsuperuser_if_not_exists',
            username='cmd_admin2',
            password='CmdPassword123!',
            email='cmd2@aic.org'
        )
        # Call second time: should not raise integrity error
        call_command(
            'createsuperuser_if_not_exists',
            username='cmd_admin2',
            password='CmdPassword123!',
            email='cmd2@aic.org'
        )
        self.assertEqual(User.objects.filter(username='cmd_admin2').count(), 1)


class AdminConfigTests(TestCase):
    def test_models_registered_in_admin(self):
        self.assertTrue(admin.site.is_registered(GalleryItem))
        self.assertTrue(admin.site.is_registered(Startup))
        self.assertTrue(admin.site.is_registered(NewsUpdate))
        self.assertTrue(admin.site.is_registered(TeamMember))
        self.assertTrue(admin.site.is_registered(BackgroundVideo))



@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class PaginationPageSizeTests(APITestCase):
    def setUp(self):
        for i in range(25):
            NewsUpdate.objects.create(
                title=f'News {i}',
                content='Body',
                thumbnail=SimpleUploadedFile(f'n{i}.png', b'x', content_type='image/png'),
            )

    def test_default_page_size_is_20(self):
        res = self.client.get('/api/news/')
        self.assertEqual(len(res.data['results']), 20)
        self.assertIsNotNone(res.data['next'])

    def test_page_size_param_returns_all_items(self):
        res = self.client.get('/api/news/?page_size=100')
        self.assertEqual(len(res.data['results']), 25)
        self.assertIsNone(res.data['next'])

    def test_page_size_param_smaller_pages(self):
        res = self.client.get('/api/news/?page_size=5')
        self.assertEqual(len(res.data['results']), 5)


class HealthEndpointTests(APITestCase):
    def test_health_returns_ok(self):
        for url in ('/api/health/', '/api/health'):
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data, {"status": "ok", "database": "ok"})
            self.assertEqual(response['Cache-Control'], 'no-store')

    def test_health_ignores_invalid_auth_header(self):
        response = self.client.get('/api/health/', HTTP_AUTHORIZATION='Bearer not-a-token')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_health_returns_503_when_database_unreachable(self):
        from django.db import DatabaseError
        with mock.patch('content.views.connection.cursor', side_effect=DatabaseError('down')):
            response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["database"], "unreachable")


class APICacheTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.item = GalleryItem.objects.create(image=generate_test_image('c1.png'), subtext='First')

    def test_list_is_served_from_cache_until_a_record_changes(self):
        first = self.client.get('/api/gallery/')
        second = self.client.get('/api/gallery/')
        self.assertEqual(first['X-Cache'], 'MISS')
        self.assertEqual(second['X-Cache'], 'HIT')
        self.assertEqual(second.json(), first.json())

        GalleryItem.objects.create(image=generate_test_image('c2.png'), subtext='Second')
        after_create = self.client.get('/api/gallery/')
        self.assertEqual(after_create['X-Cache'], 'MISS')
        self.assertEqual(after_create.json()['count'], 2)

        self.item.subtext = 'Renamed'
        self.item.save()
        after_update = self.client.get(f'/api/gallery/{self.item.pk}/')
        self.assertEqual(after_update.json()['subtext'], 'Renamed')

        self.item.delete()
        self.assertEqual(self.client.get('/api/gallery/').json()['count'], 1)

    def test_query_strings_are_cached_separately(self):
        TeamMember.objects.create(name='M', role='r', category='mentor', photo=generate_test_image('m.png'))
        TeamMember.objects.create(name='T', role='r', category='team', photo=generate_test_image('t.png'))
        self.assertEqual(self.client.get('/api/team/').json()['count'], 2)
        self.assertEqual(self.client.get('/api/team/?category=mentor').json()['count'], 1)

    def test_changes_to_one_resource_keep_others_cached(self):
        self.client.get('/api/gallery/')
        Startup.objects.create(name='S', description='d', logo_or_image=generate_test_image('s.png'))
        self.assertEqual(self.client.get('/api/gallery/')['X-Cache'], 'HIT')

    def test_public_reads_are_browser_cacheable_with_etag(self):
        response = self.client.get('/api/gallery/')
        self.assertIn('public', response['Cache-Control'])
        self.assertIn('max-age=60', response['Cache-Control'])
        self.assertIn('Authorization', response['Vary'])
        self.assertTrue(response.has_header('ETag'))

        not_modified = self.client.get('/api/gallery/', HTTP_IF_NONE_MATCH=response['ETag'])
        self.assertEqual(not_modified.status_code, status.HTTP_304_NOT_MODIFIED)
        self.assertEqual(not_modified.content, b'')

    def test_authenticated_reads_bypass_cache_and_are_not_stored(self):
        self.client.get('/api/gallery/')
        user = User.objects.create_user(username='editor', password='x', is_staff=True)
        token = RefreshToken.for_user(user).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/gallery/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.has_header('X-Cache'))
        self.assertEqual(response['Cache-Control'], 'private, no-store')

    def test_errors_are_not_cached(self):
        response = self.client.get('/api/gallery/999999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response['Cache-Control'], 'private, no-store')
        self.assertNotEqual(self.client.get('/api/gallery/999999/').get('X-Cache'), 'HIT')

    def test_background_video_is_cached_and_invalidated(self):
        self.assertIsNone(self.client.get('/api/backgroundvideo/').json()['id'])
        self.assertEqual(self.client.get('/api/backgroundvideo/')['X-Cache'], 'HIT')
        BackgroundVideo.objects.create(video_name='Hero', video_url='https://stream.example.com/a.m3u8')
        self.assertEqual(self.client.get('/api/backgroundvideo/').json()['video_name'], 'Hero')


class SiteContentTests(APITestCase):
    def test_returns_every_public_section(self):
        GalleryItem.objects.create(image=generate_test_image('g.png'), subtext='G')
        Startup.objects.create(name='S', description='d', logo_or_image=generate_test_image('s.png'))
        NewsUpdate.objects.create(title='N', content='c', thumbnail=generate_test_image('n.png'))
        TeamMember.objects.create(name='T', role='r', category='team', photo=generate_test_image('t.png'))
        BackgroundVideo.objects.create(video_name='Hero', video_url='https://stream.example.com/a.m3u8')

        data = self.client.get('/api/site-content/').json()
        self.assertEqual([len(data[k]) for k in ('gallery', 'startups', 'news', 'team')], [1, 1, 1, 1])
        self.assertEqual(data['team'][0]['category_display'], 'AIC Team')
        self.assertEqual(data['background_video']['video_name'], 'Hero')

    def test_empty_site_has_null_background_video(self):
        data = self.client.get('/api/site-content/').json()
        self.assertEqual(data['gallery'], [])
        self.assertIsNone(data['background_video'])

    def test_any_change_invalidates_the_bundle(self):
        self.client.get('/api/site-content/')
        self.assertEqual(self.client.get('/api/site-content/')['X-Cache'], 'HIT')
        TeamMember.objects.create(name='T', role='r', category='team', photo=generate_test_image('t.png'))
        response = self.client.get('/api/site-content/')
        self.assertEqual(response['X-Cache'], 'MISS')
        self.assertEqual(len(response.json()['team']), 1)

    def test_health_check_warms_the_bundle(self):
        self.client.get('/api/health/')
        self.assertEqual(self.client.get('/api/site-content/')['X-Cache'], 'HIT')
