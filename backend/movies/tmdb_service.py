# movies/tmdb_service.py
import requests
import datetime
from django.conf import settings
from .models import Movie, Category, Actor, Country

# 
# *** BẠN HÃY CHÉP TOÀN BỘ LOGIC TỪ ImportTMDBView SANG ĐÂY ***
# 
# Chúng ta biến nó thành một hàm, nhận vào tmdb_id và trả về (movie, created)
#

def import_movie_from_tmdb(tmdb_id, force_update=False, prefer_vi=True):
    """
    Hàm này lấy 1 tmdb_id, gọi 3 API của TMDB (detail, credits, videos),
    và tạo hoặc trả về một Movie object trong CSDL.
    
    Trả về: (movie_object, created_boolean)
    """

    # 1. Kiểm tra xem phim đã tồn tại trong CSDL chưa
    existing_movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
    if existing_movie and existing_movie.description and not force_update:
        # Đã có dữ liệu và không yêu cầu cập nhật cưỡng bức -> bỏ qua
        return (existing_movie, False)

    try:
        # === GỌI API CHI TIẾT (LẤY INFO CHÍNH) ===
        detail_url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}"
        params_vi = {
            'api_key': settings.TMDB_API_KEY,
            'language': 'vi-VN'
        }
        detail_response = requests.get(detail_url, params=params_vi)
        detail_response.raise_for_status()
        movie_data = detail_response.json()

        # Ưu tiên: tham khảo Translations (bản dịch 'vi')
        if prefer_vi:
            translations_url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}/translations"
            try:
                tr_resp = requests.get(translations_url, params={'api_key': settings.TMDB_API_KEY})
                if tr_resp.ok:
                    tr_data = tr_resp.json() or {}
                    translations = tr_data.get('translations', [])
                    vi_entry = next((t for t in translations if t.get('iso_639_1') == 'vi'), None)
                    if vi_entry and vi_entry.get('data'):
                        vi_data = vi_entry['data']
                        # Luôn ưu tiên tiếng Việt nếu có dữ liệu hợp lệ
                        if vi_data.get('overview'):
                            movie_data['overview'] = vi_data.get('overview')
                        if vi_data.get('title'):
                            movie_data['title'] = vi_data.get('title')
            except requests.RequestException:
                # Bỏ qua lỗi translations, sẽ dùng fallback en-US phía dưới nếu cần
                pass

        # Cuối cùng: fallback en-US nếu vẫn thiếu
        need_fallback = not movie_data.get('overview') or not movie_data.get('title')
        if need_fallback:
            params_en = {
                'api_key': settings.TMDB_API_KEY,
                'language': 'en-US'
            }
            en_response = requests.get(detail_url, params=params_en)
            if en_response.ok:
                movie_data_en = en_response.json()
                if not movie_data.get('overview') and movie_data_en.get('overview'):
                    movie_data['overview'] = movie_data_en.get('overview')
                if not movie_data.get('title') and movie_data_en.get('title'):
                    movie_data['title'] = movie_data_en.get('title')
                if not movie_data.get('original_title') and movie_data_en.get('original_title'):
                    movie_data['original_title'] = movie_data_en.get('original_title')

        # === GỌI API CREDITS (LẤY DIỄN VIÊN) ===
        credits_url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}/credits"
        credits_params = {'api_key': settings.TMDB_API_KEY}
        credits_response = requests.get(credits_url, params=credits_params)
        credits_response.raise_for_status()
        credits_data = credits_response.json()

        # === GỌI API VIDEOS (LẤY TRAILER) ===
        videos_url = f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}/videos"
        trailer_key = None
        def pick_trailer(videos):
            if not videos:
                return None
            # Ưu tiên official Trailer trên YouTube, sau đó Trailer, rồi Teaser
            yt = [v for v in videos if v.get('site') == 'YouTube']
            official_trailer = next((v for v in yt if v.get('type') == 'Trailer' and v.get('official')), None)
            if official_trailer:
                return official_trailer.get('key')
            any_trailer = next((v for v in yt if v.get('type') == 'Trailer'), None)
            if any_trailer:
                return any_trailer.get('key')
            teaser = next((v for v in yt if v.get('type') == 'Teaser'), None)
            return teaser.get('key') if teaser else None

        # Thử vi-VN trước
        for lang in ('vi-VN', 'en-US', None):
            params_v = {'api_key': settings.TMDB_API_KEY}
            if lang:
                params_v['language'] = lang
            v_resp = requests.get(videos_url, params=params_v)
            if not v_resp.ok:
                continue
            vids = v_resp.json().get('results', [])
            trailer_key = pick_trailer(vids)
            if trailer_key:
                break
        
        trailer_full_url = f"https://www.youtube.com/watch?v={trailer_key}" if trailer_key else None

        # === XỬ LÝ DỮ LIỆU PHỤ TRỢ (QUỐC GIA, THỂ LOẠI, DIỄN VIÊN) ===
        country_obj = None
        production_countries = movie_data.get('production_countries', [])
        if production_countries:
            country_name = production_countries[0]['name']
            country_obj, created = Country.objects.get_or_create(name=country_name)

        # === TẠO MỚI HOẶC CẬP NHẬT MOVIE ===
        if existing_movie:
            # Cập nhật phim đang thiếu mô tả/tiêu đề
            m = existing_movie
            created_flag = False
        else:
            m = Movie(tmdb_id=movie_data['id'])
            created_flag = True

        m.title = movie_data['title']
        m.original_title = movie_data.get('original_title', '')
        m.description = movie_data.get('overview', '')
        m.poster = f"https://image.tmdb.org/t/p/w500{movie_data.get('poster_path')}"
        m.banner = f"https://image.tmdb.org/t/p/w1280{movie_data.get('backdrop_path')}"
        m.release_year = int(movie_data['release_date'].split('-')[0]) if movie_data.get('release_date') else None
        m.duration = movie_data.get('runtime', None)
        m.status = movie_data.get('status', None)
        m.trailer_url = trailer_full_url
        m.country = country_obj
        m.save()

        if movie_data.get('genres') is not None:
            m.categories.clear()
            for genre in movie_data.get('genres', []):
                category, _ = Category.objects.get_or_create(name=genre['name'])
                m.categories.add(category)

        if credits_data.get('cast') is not None:
            m.actors.clear()
            for cast in credits_data.get('cast', [])[:5]:
                actor, _ = Actor.objects.get_or_create(name=cast['name'])
                m.actors.add(actor)

        m.save()

        return (m, created_flag)

    except requests.RequestException as e:
        # Nếu gọi API thất bại, ném ra lỗi để View hoặc Command có thể bắt
        raise Exception(f"Failed to fetch from TMDB (ID: {tmdb_id}): {str(e)}")
    except Exception as e:
        raise Exception(f"An unexpected error occurred (ID: {tmdb_id}): {str(e)}")


def import_recent_movies_from_tmdb(start_year=2025, end_date=None, max_pages=5, language='vi-VN', force_update=False):
    """
    Sử dụng TMDB Discover API để lấy danh sách phim phát hành từ `start_year` đến `end_date` (mặc định hôm nay),
    sau đó lần lượt gọi `import_movie_from_tmdb` để đưa vào CSDL.

    Trả về dict thống kê: {
        'found': <tổng số kết quả duyệt>,
        'imported': <số phim mới thêm>,
        'skipped': <số phim đã tồn tại>,
        'failed': <số phim lỗi>
    }
    """
    if end_date is None:
        end_date = datetime.date.today().isoformat()

    url = f"{settings.TMDB_BASE_URL}/discover/movie"

    total_found = 0
    imported = 0
    skipped = 0
    failed = 0

    for page in range(1, max_pages + 1):
        params = {
            'api_key': settings.TMDB_API_KEY,
            'language': language,
            'sort_by': 'primary_release_date.desc',
            'include_adult': 'false',
            'include_video': 'false',
            'page': page,
            'primary_release_date.gte': f"{start_year}-01-01",
            'primary_release_date.lte': end_date,
            # Ưu tiên phim đã phát hành tại rạp (2) hoặc phát hành rộng rãi (3)
            'with_release_type': '2|3',
        }

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            results = data.get('results', [])
        except requests.RequestException as e:
            # Nếu một trang lỗi, dừng luôn để an toàn
            raise Exception(f"Failed to fetch discover page {page}: {str(e)}")

        if not results:
            break

        total_found += len(results)

        for item in results:
            tmdb_id = item.get('id')
            if not tmdb_id:
                continue
            try:
                _, created = import_movie_from_tmdb(tmdb_id, force_update=force_update, prefer_vi=True)

                if created:
                    imported += 1
                else:
                    skipped += 1
            except Exception:
                failed += 1

        # Nếu đã tới trang cuối cùng theo TMDB
        total_pages = data.get('total_pages')
        if total_pages and page >= total_pages:
            break

    return {
        'found': total_found,
        'imported': imported,
        'skipped': skipped,
        'failed': failed,
    }