"""
Replace Gallery, Startups, News and Team content with the data scraped from the
legacy site (https://icentre.iiitkottayam.ac.in/).

Data lives in content/legacy_data/legacy_site.json; images are read from the
frontend's public/ folder and uploaded through the configured storage backend
(local media/ or Cloudinary).

    python manage.py import_legacy_content            # dry run, changes nothing
    python manage.py import_legacy_content --apply    # delete existing rows and import
"""
import io
import json
from datetime import date, timedelta
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone
from PIL import Image, ImageOps

from content.models import GalleryItem, NewsUpdate, Startup, TeamMember

MAX_IMAGE_SIDE = 2400
DATA_FILE = Path(__file__).resolve().parents[2] / 'legacy_data' / 'legacy_site.json'
DEFAULT_IMAGES_DIR = settings.BASE_DIR.parent / 'frontend' / 'public'


class Command(BaseCommand):
    help = 'Replace gallery, startups, news and team rows with legacy site data.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true',
                            help='Actually delete existing rows and import. Without this, only a dry run is printed.')
        parser.add_argument('--images-dir', default=str(DEFAULT_IMAGES_DIR),
                            help='Folder that image paths in the JSON are relative to (default: frontend/public).')
        parser.add_argument('--allow-local-media', action='store_true',
                            help='Allow writing images to local media/ while the database is remote.')

    def handle(self, *args, **opts):
        self.images_dir = Path(opts['images_dir'])
        data = json.loads(DATA_FILE.read_text(encoding='utf-8'))
        self._check_images(data)

        db = connection.settings_dict
        storage = settings.STORAGES['default']['BACKEND']
        is_remote_db = db['ENGINE'].endswith('postgresql') and db.get('HOST') not in ('localhost', '127.0.0.1', '')
        self.stdout.write(f"Database: {db['ENGINE'].rsplit('.', 1)[-1]} {db.get('NAME')} @ {db.get('HOST') or 'local'}")
        self.stdout.write(f'Storage:  {storage}')

        self._print_plan(data)

        if not opts['apply']:
            self.stdout.write(self.style.WARNING('\nDry run only. Re-run with --apply to replace the data.'))
            return

        if is_remote_db and 'FileSystemStorage' in storage and not opts['allow_local_media']:
            raise CommandError(
                'The database is remote but images would be saved to local media/, so the deployed site '
                'would get broken image links. Set USE_CLOUDINARY=True, or pass --allow-local-media if intended.'
            )

        with transaction.atomic():
            self._replace(data)
        self.stdout.write(self.style.SUCCESS('\nLegacy content imported.'))

    # ------------------------------------------------------------------

    def _image_paths(self, data):
        yield from (m['photo'] for m in data['team'] if m.get('photo'))
        yield from (s['logo'] for s in data['startups'])
        yield from data['gallery']
        yield from (n['thumbnail'] for n in data['news'])

    def _check_images(self, data):
        missing = [p for p in self._image_paths(data) if not (self.images_dir / p).is_file()]
        if missing:
            raise CommandError(f'{len(missing)} image(s) not found under {self.images_dir}:\n  ' + '\n  '.join(missing))

    def _print_plan(self, data):
        current = {
            'Gallery': GalleryItem.objects.count(),
            'Startups': Startup.objects.count(),
            'News': NewsUpdate.objects.count(),
            'Team (all categories)': TeamMember.objects.count(),
        }
        incoming = {
            'Gallery': len(data['gallery']),
            'Startups': len(data['startups']),
            'News': len(data['news']),
            'Team (all categories)': len(data['team']) + len(data['governor']) + len(data['mentor']),
        }
        self.stdout.write('\n{:<24}{:>10}{:>10}'.format('', 'delete', 'create'))
        for key in current:
            self.stdout.write('{:<24}{:>10}{:>10}'.format(key, current[key], incoming[key]))
        self.stdout.write(f"  (team {len(data['team'])}, governors {len(data['governor'])}, mentors {len(data['mentor'])})")

    def _attach(self, field, rel_path):
        path = self.images_dir / rel_path
        with Image.open(path) as im:
            if max(im.size) <= MAX_IMAGE_SIDE:
                with path.open('rb') as fh:
                    field.save(path.name, File(fh), save=False)
                return
            # Downscale oversized originals so the site doesn't serve multi-MB photos.
            im = ImageOps.exif_transpose(im)
            im.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
            buf = io.BytesIO()
            if im.mode in ('RGBA', 'LA', 'P'):
                im.save(buf, 'PNG', optimize=True)
                name = path.stem + '.png'
            else:
                im.convert('RGB').save(buf, 'JPEG', quality=85, optimize=True)
                name = path.stem + '.jpg'
            field.save(name, ContentFile(buf.getvalue()), save=False)

    def _replace(self, data):
        for model in (GalleryItem, Startup, NewsUpdate, TeamMember):
            model.objects.all().delete()

        # Gallery and startups are ordered by -created_at, so the first item
        # gets the newest timestamp to keep the legacy site's display order.
        now = timezone.now()

        self.stdout.write(f"Gallery: uploading {len(data['gallery'])} images...")
        for i, rel_path in enumerate(data['gallery']):
            item = GalleryItem(subtext='')
            self._attach(item.image, rel_path)
            item.save()
            GalleryItem.objects.filter(pk=item.pk).update(created_at=now - timedelta(minutes=i))

        self.stdout.write(f"Startups: uploading {len(data['startups'])} logos...")
        for i, s in enumerate(data['startups']):
            startup = Startup(name=s['name'], description=s.get('description', ''), website_url=s.get('website_url'))
            self._attach(startup.logo_or_image, s['logo'])
            startup.save()
            Startup.objects.filter(pk=startup.pk).update(created_at=now - timedelta(minutes=i))

        self.stdout.write(f"News: creating {len(data['news'])} items...")
        for n in data['news']:
            news = NewsUpdate(title=n['title'], subtitle=n.get('subtitle', ''), content=n['content'])
            self._attach(news.thumbnail, n['thumbnail'])
            news.save()
            # published_date is auto_now_add; set the real date afterwards.
            NewsUpdate.objects.filter(pk=news.pk).update(published_date=date.fromisoformat(n['date']))

        self.stdout.write('Team: creating members...')
        for category in ('team', 'governor', 'mentor'):
            for m in data[category]:
                bio = m.get('bio') or m.get('group', '')
                member = TeamMember(name=m['name'], role=m['role'], category=category, bio=bio)
                if m.get('photo'):
                    self._attach(member.photo, m['photo'])
                # Members without a photo keep an empty field; the frontend shows initials.
                member.save()
