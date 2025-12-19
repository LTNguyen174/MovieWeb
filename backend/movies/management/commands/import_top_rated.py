# movies/management/commands/import_top_rated.py
import csv
from django.core.management.base import BaseCommand
from django.conf import settings
from movies.tmdb_service import import_movie_from_tmdb

# Import from top_rated_movies (1).csv file
CSV_FILE_PATH = settings.BASE_DIR / 'top_rated_movies (1).csv'

class Command(BaseCommand):
    help = 'Import top rated movies from top_rated_movies (1).csv file (using tmdb_id) into the database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('Starting top rated movies import from CSV...'))

        try:
            with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as file:
                # Đọc file CSV
                reader = csv.DictReader(file)
                
                total_rows = 0
                imported_count = 0
                skipped_count = 0
                failed_count = 0

                for row in reader:
                    total_rows += 1
                    tmdb_id = row.get('id')  # Lấy ID từ cột 'id' (TMDB ID)
                    
                    if not tmdb_id:
                        self.stdout.write(self.style.ERROR(f'Row {total_rows}: Missing tmdb_id. Skipping.'))
                        failed_count += 1
                        continue

                    try:
                        # Gọi service để nhập phim
                        self.stdout.write(f'Processing TMDB ID: {tmdb_id}...')
                        movie, created = import_movie_from_tmdb(tmdb_id)
                        
                        if created:
                            self.stdout.write(self.style.SUCCESS(f'  SUCCESS: Imported "{movie.title}"'))
                            imported_count += 1
                        else:
                            self.stdout.write(self.style.WARNING(f'  SKIPPED: "{movie.title}" already exists.'))
                            skipped_count += 1

                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'  FAILED (ID: {tmdb_id}): {str(e)}'))
                        failed_count += 1

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'File not found at: {CSV_FILE_PATH}'))
            return

        # In kết quả cuối cùng
        self.stdout.write(self.style.HTTP_INFO('\nImport Complete!'))
        self.stdout.write(self.style.SUCCESS(f'Successfully imported: {imported_count}'))
        self.stdout.write(self.style.WARNING(f'Skipped (already exist): {skipped_count}'))
        self.stdout.write(self.style.ERROR(f'Failed: {failed_count}'))
        self.stdout.write(f'Total rows processed: {total_rows}')
