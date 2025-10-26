# movies/management/commands/import_csv.py
import csv
from django.core.management.base import BaseCommand
from django.conf import settings
from movies.tmdb_service import import_movie_from_tmdb # <-- Gọi service

# Giả định file 'data.csv' nằm ở thư mục gốc của project (ngang hàng 'manage.py')
CSV_FILE_PATH = settings.BASE_DIR / 'top10K-TMDB-movies.csv'

class Command(BaseCommand):
    help = 'Import movies from a CSV file (using tmdb_id) into the database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('Starting movie import from CSV...'))

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
                    tmdb_id = row.get('tmdb_id') # Lấy ID từ cột 'tmdb_id'
                    
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