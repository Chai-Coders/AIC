import io
from PIL import Image
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib import admin
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from rest_framework.test import APITestCase
from rest_framework import status

from .models import GalleryItem, Startup, NewsUpdate, TeamMember

User = get_user_model()


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

