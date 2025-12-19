# movies/management/commands/import_recent_tmdb.py
from django.core.management.base import BaseCommand
from django.conf import settings
from movies.tmdb_service import import_recent_movies_from_tmdb

class Command(BaseCommand):
    help = 'Import recent movies from TMDB Discover API without using CSV.'

    def add_arguments(self, parser):
        parser.add_argument('--start-year', type=int, default=2025, help='Start release year (default: 2025)')
        parser.add_argument('--max-pages', type=int, default=5, help='Max TMDB pages to fetch (default: 5)')
        parser.add_argument('--language', type=str, default='vi-VN', help='TMDB language (default: vi-VN)')
        parser.add_argument('--force-update', action='store_true', help='Force update existing movies to refresh Vietnamese overview/title and trailer')

    def handle(self, *args, **options):
        if not settings.TMDB_API_KEY:
            self.stdout.write(self.style.ERROR('TMDB_API_KEY is not set. Please configure it in your .env.'))
            return

        start_year = options['start_year']
        max_pages = options['max_pages']
        language = options['language']
        force_update = options['force_update']

        self.stdout.write(self.style.HTTP_INFO(
            f"Starting TMDB import from year {start_year}, max_pages={max_pages}, language={language}..."
        ))

        try:
            stats = import_recent_movies_from_tmdb(
                start_year=start_year,
                max_pages=max_pages,
                language=language,
                force_update=force_update,
            )
            self.stdout.write(self.style.SUCCESS('Import finished successfully.'))
            self.stdout.write(self.style.HTTP_INFO(f"Found: {stats['found']}"))
            self.stdout.write(self.style.SUCCESS(f"Imported: {stats['imported']}"))
            self.stdout.write(self.style.WARNING(f"Skipped: {stats['skipped']}"))
            self.stdout.write(self.style.ERROR(f"Failed: {stats['failed']}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Import failed: {str(e)}'))
