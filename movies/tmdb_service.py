# movies/tmdb_service.py
import requests
from django.conf import settings
from .models import Movie, Category, Actor, Country

# 
# *** BẠN HÃY CHÉP TOÀN BỘ LOGIC TỪ ImportTMDBView SANG ĐÂY ***
# 
# Chúng ta biến nó thành một hàm, nhận vào tmdb_id và trả về (movie, created)
#


def import_movie_from_tmdb(tmdb_id):
    """
    Hàm này lấy 1 tmdb_id, gọi 3 API của TMDB (detail, credits, videos),
    và tạo hoặc trả về một Movie object trong CSDL.
    
    Trả về: (movie_object, created_boolean)
    """

    # 1. Kiểm tra xem phim đã tồn tại trong CSDL chưa
    existing_movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
    if existing_movie:
        # Nếu đã tồn tại, trả về nó, created=False
        return (existing_movie, False)

    try:
        # === GỌI API CHI TIẾT (LẤY INFO CHÍNH) ===
        detail_url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}"
        params = {
            'api_key': settings.TMDB_API_KEY,
            'language': 'vi-VN'
        }
        detail_response = requests.get(detail_url, params=params)
        detail_response.raise_for_status()
        movie_data = detail_response.json()

        # === GỌI API CREDITS (LẤY DIỄN VIÊN) ===
        credits_url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}/credits"
        credits_params = {'api_key': settings.TMDB_API_KEY}
        credits_response = requests.get(credits_url, params=credits_params)
        credits_response.raise_for_status()
        credits_data = credits_response.json()

        # === GỌI API VIDEOS (LẤY TRAILER) ===
        videos_url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}/videos"
        videos_params = {'api_key': settings.TMDB_API_KEY, 'language': 'en-US'}
        videos_response = requests.get(videos_url, params=videos_params)
        videos_response.raise_for_status()
        videos_data = videos_response.json().get('results', [])
        
        trailer_key = None
        for video in videos_data:
            if video['type'] == 'Trailer' and video['site'] == 'YouTube':
                trailer_key = video['key']
                break
        
        trailer_full_url = f"https://www.youtube.com/watch?v={trailer_key}" if trailer_key else None

        # === XỬ LÝ DỮ LIỆU PHỤ TRỢ (QUỐC GIA, THỂ LOẠI, DIỄN VIÊN) ===
        country_obj = None
        production_countries = movie_data.get('production_countries', [])
        if production_countries:
            country_name = production_countries[0]['name']
            country_obj, created = Country.objects.get_or_create(name=country_name)

        # === TẠO MOVIE VÀ LƯU VÀO POSTGRESQL ===
        new_movie = Movie.objects.create(
            tmdb_id=movie_data['id'],
            title=movie_data['title'],
            original_title=movie_data.get('original_title', ''),
            description=movie_data.get('overview', ''),
            poster=f"https://image.tmdb.org/t/p/w500{movie_data.get('poster_path')}",
            banner=f"https://image.tmdb.org/t/p/w1280{movie_data.get('backdrop_path')}",
            release_year=int(movie_data['release_date'].split('-')[0]) if movie_data.get('release_date') else None,
            duration=movie_data.get('runtime', None),
            status=movie_data.get('status', None),
            trailer_url=trailer_full_url,
            country=country_obj,
        )

        for genre in movie_data.get('genres', []):
            category, created = Category.objects.get_or_create(name=genre['name'])
            new_movie.categories.add(category)

        for cast in credits_data.get('cast', [])[:5]:
            actor, created = Actor.objects.get_or_create(name=cast['name'])
            new_movie.actors.add(actor)

        new_movie.save()
        
        # Trả về phim vừa tạo, created=True
        return (new_movie, True)

    except requests.RequestException as e:
        # Nếu gọi API thất bại, ném ra lỗi để View hoặc Command có thể bắt
        raise Exception(f"Failed to fetch from TMDB (ID: {tmdb_id}): {str(e)}")
    except Exception as e:
        raise Exception(f"An unexpected error occurred (ID: {tmdb_id}): {str(e)}")