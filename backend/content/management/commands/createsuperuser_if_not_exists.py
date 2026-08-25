import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = (
        'Idempotently creates a superuser/admin account from environment variables or command-line arguments. '
        'If the user already exists, it exits cleanly without error (safe for CI/CD and Docker startups).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default=os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin'),
            help='Specifies the login username for the superuser (default: DJANGO_SUPERUSER_USERNAME or admin).'
        )
        parser.add_argument(
            '--password',
            type=str,
            default=os.environ.get('DJANGO_SUPERUSER_PASSWORD', None),
            help='Specifies the password for the superuser (default: DJANGO_SUPERUSER_PASSWORD).'
        )
        parser.add_argument(
            '--email',
            type=str,
            default=os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com'),
            help='Specifies the email address for the superuser (default: DJANGO_SUPERUSER_EMAIL or admin@example.com).'
        )

    def handle(self, *args, **options):
        username = options.get('username')
        password = options.get('password')
        email = options.get('email')

        if not username:
            self.stderr.write(self.style.ERROR("Error: Admin username cannot be empty."))
            return

        if not password:
            self.stderr.write(
                self.style.WARNING(
                    "Warning: No password specified via --password or DJANGO_SUPERUSER_PASSWORD. "
                    "Skipping automated superuser creation."
                )
            )
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.SUCCESS(f"Admin user '{username}' already exists. No action required.")
            )
            return

        # Create the superuser
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        self.stdout.write(
            self.style.SUCCESS(f"Successfully created admin superuser '{username}' ({email}).")
        )
