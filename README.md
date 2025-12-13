
# MovieWeb

Hệ thống backend API phim nhẹ (Django) với frontend Next.js. Kho chứa này bao gồm hai phần chính:

- `movie_project/` - Backend Django (REST API, embeddings, tích hợp OpenAI).
- `movie-frontend/` - Frontend Next.js (React + TypeScript).

## Điều kiện tiên quyết

- Git
- Python 3.11+ (khuyến nghị cho Django 5.x)
- Node.js 18+ và `pnpm` hoặc `npm` (cho frontend)
- PostgreSQL (nếu muốn chạy với DB thực; ứng dụng đọc thông tin DB từ biến môi trường)

## Backend Python (phát triển)

Mở PowerShell và chạy các bước này từ thư mục gốc của kho chứa (`MovieWeb`):

1. Tạo và kích hoạt môi trường ảo

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Cài đặt dependencies Python

```powershell
pip install -U pip
pip install -r requirements.txt
```


3. Tạo file `.env` trong thư mục gốc dự án (cùng thư mục với `manage.py`) và thiết lập các biến môi trường cần thiết. Ví dụ `.env`:

```
SECRET_KEY=your-django-secret-key
DB_NAME=movie_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=127.0.0.1
DB_PORT=5432
TMDB_API_KEY=your_tmdb_api_key
OPENAI_API_KEY=your_openai_api_key   # tùy chọn nhưng cần thiết cho tính năng OpenAI
```

4. Áp dụng migrations và tạo superuser

```powershell
python manage.py migrate
python manage.py createsuperuser
```

6. Chạy máy chủ phát triển

```powershell
python manage.py runserver
```

Mặc định API sẽ có sẵn tại `http://127.0.0.1:8000`.

## Frontend (Next.js)

Frontend nằm trong thư mục `movie-frontend/` và sử dụng `pnpm` (nhưng cũng hoạt động với `npm`).

Từ thư mục gốc kho chứa:

```powershell
cd movie-frontend
pnpm install    # hoặc `npm install`
pnpm dev        # hoặc `npm run dev`

# Mở http://localhost:3000
```

Đảm bảo backend đang chạy (CORS được bật cho `http://localhost:3000` trong `movie_project/settings.py`).

## Ghi chú môi trường & cấu hình

- `movie_project/settings.py` tải file `.env` sử dụng `python-dotenv`.
- Các biến môi trường bắt buộc: `SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `TMDB_API_KEY`.
- Tùy chọn: `OPENAI_API_KEY` cho tính năng OpenAI.


## Chạy tests

Chạy tests Django từ thư mục gốc kho chứa:

```powershell
python manage.py test
```

