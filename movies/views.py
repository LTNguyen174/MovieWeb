import requests
import os, json
from .openai_client import has_key as openai_has_key, chat_completion_with_tools
from .embeddings import load_embeddings, get_top_k
from .keyword_extractor import extractor
from sentence_transformers import SentenceTransformer
from .tmdb_service import import_movie_from_tmdb
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, Count, Q, Avg
from users.models import User
from rest_framework import viewsets, generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from django.contrib.auth import get_user_model
from django.db.models import Count

User = get_user_model()

from .models import Movie, Category, Rating, Comment, Actor, Country, Episode, WatchHistory, CommentReaction, Favorite
from .serializers import (
    MovieSerializer, MovieDetailSerializer, CategorySerializer, CountrySerializer,
    ActorSerializer, RatingCreateSerializer, UserSerializer, UserCreateSerializer,
    CommentSerializer, CommentCreateSerializer, CommentUpdateSerializer, AdminCommentSerializer,
    EpisodeSerializer, AdminMovieSerializer
)
from .permissions import IsOwnerOrReadOnly

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().annotate(movie_count=Count('movies', distinct=True))
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 100

class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Movie.objects.all().order_by('-views')
    lookup_field = 'tmdb_id'
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [SearchFilter]
    search_fields = ['title']
    pagination_class = StandardResultsSetPagination

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def extract_keywords(self, request):
        """Extract keywords from search query using SBERT"""
        query = request.data.get('query', '').strip()
        if not query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            keywords = extractor.extract_keywords(query)
            formatted_info = extractor.format_extracted_info(keywords)
            
            return Response({
                'keywords': keywords,
                'formatted_info': formatted_info
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_queryset(self):
        queryset = Movie.objects.all().order_by('-views')
        
        # DEBUG: Log all query parameters
        print(f"DEBUG MovieViewSet: Query params = {self.request.query_params}")
        
        # Enhanced search with keyword extraction
        search_param = self.request.query_params.get('search', None)
        if search_param:
            # Extract keywords using SBERT
            keywords = extractor.extract_keywords(search_param)
            print(f"DEBUG Extracted keywords: {keywords}")
            
            # Apply filters based on extracted keywords
            
            # Filter by movie title if specified
            if keywords['movie_title']:
                queryset = queryset.filter(title__icontains=keywords['movie_title'])
            
            # Filter by genres
            if keywords['genres']:
                for genre in keywords['genres']:
                    queryset = queryset.filter(categories__name__icontains=genre)
            
            # Filter by country
            if keywords['country']:
                queryset = queryset.filter(country__name__icontains=keywords['country'])
            
            # Filter by year
            if keywords['year']:
                queryset = queryset.filter(release_year=keywords['year'])
            
            # If no specific filters found, use traditional title search
            if not keywords['genres'] and not keywords['country'] and not keywords['year'] and not keywords['movie_title']:
                queryset = queryset.filter(title__icontains=search_param)
        
        # Filter by tmdb_ids (for AI suggestions)
        tmdb_ids_param = self.request.query_params.get('tmdb_ids', None)
        if tmdb_ids_param:
            print(f"DEBUG MovieViewSet: tmdb_ids_param = {tmdb_ids_param}")
            tmdb_ids = [int(x) for x in tmdb_ids_param.split(',') if x.strip().isdigit()]
            print(f"DEBUG MovieViewSet: tmdb_ids = {tmdb_ids}")
            if tmdb_ids:
                queryset = queryset.filter(tmdb_id__in=tmdb_ids)
        
        # Filter by categories (AND logic - phim phải có TẤT CẢ categories được chọn)
        categories_param = self.request.query_params.get('categories', None)
        if categories_param:
            category_ids = [int(id) for id in categories_param.split(',') if id.isdigit()]
            for cat_id in category_ids:
                queryset = queryset.filter(categories__id=cat_id)
        
        # Filter by country
        country_param = self.request.query_params.get('country', None)
        if country_param:
            # Filter by country name or code
            queryset = queryset.filter(country__name__icontains=country_param)
        
        # Filter by year
        year_param = self.request.query_params.get('release_year', None)
        if year_param and year_param.isdigit():
            queryset = queryset.filter(release_year=int(year_param))
        
        # Filter by actors
        actors_param = self.request.query_params.get('actors', None)
        if actors_param:
            actor_ids = [int(id) for id in actors_param.split(',') if id.isdigit()]
            queryset = queryset.filter(actors__id__in=actor_ids)
        
        return queryset.distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MovieDetailSerializer
        return MovieSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def rate(self, request, tmdb_id=None):
        """Đánh giá phim"""
        movie = self.get_object()
        user = request.user
        
        score = request.data.get('score')
        if not score or not (1 <= float(score) <= 10):
            return Response({'error': 'Score must be between 1 and 10'}, status=status.HTTP_400_BAD_REQUEST)
        
        rating, created = Rating.objects.update_or_create(
            user=user, movie=movie,
            defaults={'stars': float(score)}
        )
        
        return Response({'message': 'Rating saved successfully'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def favorite(self, request, tmdb_id=None):
        """Thêm/xóa phim yêu thích"""
        movie = self.get_object()
        user = request.user
        
        favorite, created = Favorite.objects.get_or_create(user=user, movie=movie)
        
        if not created:
            favorite.delete()
            return Response({'message': 'Removed from favorites'}, status=status.HTTP_200_OK)
        
        return Response({'message': 'Added to favorites'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def watch(self, request, tmdb_id=None):
        """Đánh dấu đã xem"""
        movie = self.get_object()
        user = request.user
        
        WatchHistory.objects.get_or_create(user=user, movie=movie)
        
        # Không tăng views ở đây - chỉ increment_view mới tăng
        return Response({'message': 'Marked as watched'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def top_rated(self, request):
        """Lấy phim có rating cao nhất"""
        limit = int(request.GET.get('limit', 10))
        movies = Movie.objects.annotate(
            avg_rating=Avg('ratings__stars')
        ).filter(avg_rating__isnull=False).order_by('-avg_rating')[:limit]
        
        serializer = MovieSerializer(movies, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def trending(self, request):
        """Lấy phim trending từ TMDB API"""
        window = request.GET.get('window', 'day')
        limit = int(request.GET.get('limit', 10))
        
        try:
            # Gọi TMDB API để lấy trending movies
            tmdb_url = f"{settings.TMDB_BASE_URL}/trending/movie/{window}"
            params = {
                'api_key': settings.TMDB_API_KEY,
                'language': 'vi-VN'
            }
            
            response = requests.get(tmdb_url, params=params)
            response.raise_for_status()
            tmdb_data = response.json()
            
            # Lấy danh sách tmdb_id từ kết quả TMDB
            tmdb_results = tmdb_data.get('results', [])[:limit]
            
            # Import các phim vào database nếu chưa có
            movies = []
            for tmdb_movie in tmdb_results:
                tmdb_id = tmdb_movie.get('id')
                try:
                    # Thử lấy phim từ database
                    movie = Movie.objects.get(tmdb_id=tmdb_id)
                except Movie.DoesNotExist:
                    # Nếu không có, import từ TMDB
                    try:
                        movie, _ = import_movie_from_tmdb(tmdb_id)
                    except Exception as e:
                        print(f"Failed to import movie {tmdb_id}: {e}")
                        continue
                
                if movie:
                    movies.append(movie)
            
            serializer = MovieSerializer(movies, many=True)
            return Response(serializer.data)
            
        except requests.RequestException as e:
            # Fallback: lấy phim có nhiều lượt xem nhất nếu TMDB API lỗi
            print(f"TMDB API error: {e}")
            movies = Movie.objects.all().order_by('-views')[:limit]
            serializer = MovieSerializer(movies, many=True)
            return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def new_releases(self, request):
        """Lấy phim mới nhất từ TMDB API"""
        limit = int(request.GET.get('limit', 10))
        
        try:
            # Gọi TMDB API để lấy upcoming movies
            tmdb_url = f"{settings.TMDB_BASE_URL}/movie/upcoming"
            params = {
                'api_key': settings.TMDB_API_KEY,
                'language': 'vi-VN'
            }
            
            response = requests.get(tmdb_url, params=params)
            response.raise_for_status()
            tmdb_data = response.json()
            
            # Lấy danh sách tmdb_id từ kết quả TMDB
            tmdb_results = tmdb_data.get('results', [])[:limit]
            
            # Import các phim vào database nếu chưa có
            movies = []
            for tmdb_movie in tmdb_results:
                tmdb_id = tmdb_movie.get('id')
                try:
                    # Thử lấy phim từ database
                    movie = Movie.objects.get(tmdb_id=tmdb_id)
                except Movie.DoesNotExist:
                    # Nếu không có, import từ TMDB
                    try:
                        movie, _ = import_movie_from_tmdb(tmdb_id)
                    except Exception as e:
                        print(f"Failed to import movie {tmdb_id}: {e}")
                        continue
                
                if movie:
                    movies.append(movie)
            
            serializer = MovieSerializer(movies, many=True)
            return Response(serializer.data)
            
        except requests.RequestException as e:
            # Fallback: lấy phim mới nhất từ database nếu TMDB API lỗi
            print(f"TMDB API error: {e}")
            movies = Movie.objects.all().order_by('-created_at')[:limit]
            serializer = MovieSerializer(movies, many=True)
            return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def popular(self, request):
        """Lấy phim phổ biến từ TMDB API"""
        limit = int(request.GET.get('limit', 10))
        
        try:
            # Gọi TMDB API để lấy popular movies
            tmdb_url = f"{settings.TMDB_BASE_URL}/movie/popular"
            params = {
                'api_key': settings.TMDB_API_KEY,
                'language': 'vi-VN'
            }
            
            response = requests.get(tmdb_url, params=params)
            response.raise_for_status()
            tmdb_data = response.json()
            
            # Lấy danh sách tmdb_id từ kết quả TMDB
            tmdb_results = tmdb_data.get('results', [])[:limit]
            
            # Import các phim vào database nếu chưa có
            movies = []
            for tmdb_movie in tmdb_results:
                tmdb_id = tmdb_movie.get('id')
                try:
                    # Thử lấy phim từ database
                    movie = Movie.objects.get(tmdb_id=tmdb_id)
                except Movie.DoesNotExist:
                    # Nếu không có, import từ TMDB
                    try:
                        movie, _ = import_movie_from_tmdb(tmdb_id)
                    except Exception as e:
                        print(f"Failed to import movie {tmdb_id}: {e}")
                        continue
                
                if movie:
                    movies.append(movie)
            
            serializer = MovieSerializer(movies, many=True)
            return Response(serializer.data)
            
        except requests.RequestException as e:
            # Fallback: lấy phim phổ biến từ database nếu TMDB API lỗi
            print(f"TMDB API error: {e}")
            movies = Movie.objects.all().order_by('-views')[:limit]
            serializer = MovieSerializer(movies, many=True)
            return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticatedOrReadOnly])
    def comments(self, request, tmdb_id=None):
        """Lấy hoặc tạo comments cho phim"""
        movie = self.get_object()
        
        if request.method == 'GET':
            # Chỉ lấy main comments (không có parent)
            comments = Comment.objects.filter(movie=movie, parent=None).order_by('-created_at')
            serializer = CommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
            
            serializer = CommentCreateSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user, movie=movie)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def increment_view(self, request, tmdb_id=None):
        """Tăng lượt xem phim"""
        movie = self.get_object()
        movie.views += 1
        movie.save(update_fields=['views'])
        return Response({'status': 'success', 'views': movie.views})

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def recommendations(self, request, tmdb_id=None):
        """Lấy phim đề xuất dựa trên thể loại"""
        movie = self.get_object()
        categories = movie.categories.all()
        
        # Lấy phim cùng thể loại, loại bỏ phim hiện tại
        recommended = Movie.objects.filter(
            categories__in=categories
        ).exclude(
            id=movie.id
        ).distinct()[:10]
        
        serializer = MovieSerializer(recommended, many=True)
        return Response(serializer.data)

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all().order_by('-created_at')
    permission_classes = [IsOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'create':
            return CommentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CommentUpdateSerializer
        return CommentSerializer

    def create(self, request, *args, **kwargs):
        print(f"=== COMMENT CREATE START ===")
        print(f"CommentViewSet.create: User authenticated = {request.user.is_authenticated}")
        print(f"CommentViewSet.create: User = {request.user}")
        print(f"CommentViewSet.create: Data = {request.data}")
        print(f"CommentViewSet.create: parent_id = {request.data.get('parent_id')}")
        print(f"CommentViewSet.create: Request URL = {request.get_full_path()}")
        
        try:
            response = super().create(request, *args, **kwargs)
            print(f"CommentViewSet.create: Success - created comment ID: {response.data.get('id')}")
            print(f"CommentViewSet.create: Response data keys = {list(response.data.keys())}")
            print(f"=== COMMENT CREATE END ===")
            return response
        except Exception as e:
            print(f"CommentViewSet.create ERROR: {type(e).__name__}: {str(e)}")
            import traceback
            print(f"CommentViewSet.create TRACEBACK: {traceback.format_exc()}")
            print(f"=== COMMENT CREATE END ===")
            raise

    def get_queryset(self):
        queryset = Comment.objects.all()
        movie_tmdb_id = self.request.query_params.get('movie', None)
        if movie_tmdb_id and movie_tmdb_id.isdigit():
            # Filter by tmdb_id instead of movie_id
            queryset = queryset.filter(movie__tmdb_id=int(movie_tmdb_id))
        return queryset

    def perform_create(self, serializer):
        print(f"CommentViewSet.perform_create: Starting...")
        # Serializer đã xử lý movie_tmdb_id trong create() method
        # Chỉ cần thêm user
        serializer.save(user=self.request.user)
        print(f"CommentViewSet.perform_create: Comment saved successfully")

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def react(self, request, pk=None):
        """User like/dislike a comment"""
        comment = self.get_object()
        reaction = request.data.get('reaction')
        
        if reaction not in ['like', 'dislike']:
            return Response({'error': 'Invalid reaction'}, status=status.HTTP_400_BAD_REQUEST)
        
        CommentReaction.objects.update_or_create(
            user=request.user, 
            comment=comment, 
            defaults={'reaction': reaction}
        )
        
        serializer = self.get_serializer(comment)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def remove_reaction(self, request, pk=None):
        """Remove user's reaction from comment"""
        comment = self.get_object()
        CommentReaction.objects.filter(user=request.user, comment=comment).delete()
        
        serializer = self.get_serializer(comment)
        return Response(serializer.data)

# === RECOMMENDATION ENGINE VIEWS ===


# === ADMIN VIEWS ===

class DashboardStatsView(APIView):
    """API thống kê cho Admin dashboard"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        print(f"DEBUG: DashboardStatsView.get called by user: {request.user}")
        print(f"DEBUG: User is_staff: {request.user.is_staff}")
        print(f"DEBUG: User is_authenticated: {request.user.is_authenticated}")
        
        from django.utils import timezone
        from datetime import date, timedelta
        from django.db.models import Count
        from django.db.models.functions import TruncDate
        
        today = date.today()
        
        # Get daily comment stats for last 7 days
        daily_comments = []
        daily_movies = []
        daily_users = []
        daily_ratings = []
        
        for i in range(6, -1, -1):  # Last 7 days (including today)
            day = today - timedelta(days=i)
            comment_count = Comment.objects.filter(created_at__date=day).count()
            movie_count = Movie.objects.filter(created_at__date=day).count()
            user_count = User.objects.filter(date_joined__date=day).count()
            rating_count = Rating.objects.filter(created_at__date=day).count()
            
            daily_comments.append({
                'date': day.strftime('%d/%m'),
                'count': comment_count
            })
            daily_movies.append({
                'date': day.strftime('%d/%m'),
                'count': movie_count
            })
            daily_users.append({
                'date': day.strftime('%d/%m'),
                'count': user_count
            })
            daily_ratings.append({
                'date': day.strftime('%d/%m'),
                'count': rating_count
            })
        
        stats = {
            'total_movies': Movie.objects.count(),
            'total_users': User.objects.count(),
            'total_ratings': Rating.objects.count(),
            'today_comments': Comment.objects.filter(created_at__date=today).count(),
            'daily_comments': daily_comments,
            'daily_movies': daily_movies,
            'daily_users': daily_users,
            'daily_ratings': daily_ratings,
            'top_viewed_movies': list(Movie.objects.order_by('-views')[:5].values('title', 'views', 'poster')),
        }
        
        print(f"DEBUG: Stats data prepared: {stats}")
        return Response(stats)

class FetchTMDBView(APIView):
    """API để tìm kiếm phim trên TMDB"""
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        query = request.GET.get('q', '')
        if not query:
            return Response({'error': 'Query parameter is required'}, status=400)
        
        try:
            url = f"{settings.TMDB_BASE_URL}/search/movie"
            params = {
                'api_key': settings.TMDB_API_KEY,
                'query': query,
                'language': 'vi-VN'
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            return Response(data)
            
        except requests.RequestException as e:
            return Response({'error': str(e)}, status=500)

class ImportTMDBView(APIView):
    """API để import phim từ TMDB vào database"""
    permission_classes = [IsAdminUser]
    
    def post(self, request):
        tmdb_id = request.data.get('tmdb_id')
        if not tmdb_id:
            return Response({'error': 'Missing tmdb_id'}, status=400)
        
        try:
            movie, created = import_movie_from_tmdb(tmdb_id)
            if not created:
                return Response({'error': 'Movie already exists in database'}, status=409)
            
            serializer = MovieDetailSerializer(movie)
            return Response(serializer.data, status=201)
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)


SEARCH_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_database",
            "description": "Tìm phim dựa trên các tiêu chí cụ thể như thể loại, quốc gia, năm.",
            "parameters": {
                "type": "object",
                "properties": {
                    "genres": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Danh sách thể loại (VD: ['Hành động', 'Hoạt hình'])"
                    },
                    "country": {
                        "type": "string",
                        "description": "Tên quốc gia (VD: Nhật Bản, Mỹ)"
                    },
                    "year": {"type": "integer"},
                    "keyword": {"type": "string", "description": "Từ khóa tìm kiếm nội dung"}
                },
                "required": []
            }
        }
    }
]

class ChatAPIView(APIView):
    """AI movie chatbot thông minh: Kết hợp Function Calling (Lọc chính xác) và Embeddings (Tìm ngữ nghĩa)"""
    permission_classes = [AllowAny]

    # Giữ lại encoder cho trường hợp fallback
    MODEL_NAME = "all-MiniLM-L6-v2"
    _ENCODER = None

    def get_encoder(self):
        if ChatAPIView._ENCODER is None:
            try:
                ChatAPIView._ENCODER = SentenceTransformer(ChatAPIView.MODEL_NAME)
            except Exception:
                ChatAPIView._ENCODER = None
        return ChatAPIView._ENCODER

    EMB_IDS, EMB_MATRIX = load_embeddings()

    def post(self, request):
        message = (request.data.get("message") or "").strip()
        history = request.data.get("history") or []
        
        if not message:
            return Response({"error": "Empty message"}, status=status.HTTP_400_BAD_REQUEST)

        movies = []
        ai_reply_text = ""
        
        # --- BƯỚC 1: HỎI AI XEM USER MUỐN GÌ (Function Calling) ---
        # Prepare an analysis prompt asking the model to return a JSON with filter fields
        msgs_analysis = [
            {"role": "system", "content": "Bạn là một trợ lý giúp trích xuất thông tin lọc phim từ câu truy vấn.\nTrả về một JSON object với các khóa: genres (array of strings), country (string), year (integer or null), keyword (string or null). Nếu không có, trả về {}."},
            {"role": "user", "content": message}
        ]

        analysis_result = None
        if openai_has_key():
            try:
                analysis_text = chat_completion(msgs_analysis, max_tokens=200, temperature=0.0)
                # Try to parse JSON out of the model output
                import re, json as _json
                # Attempt to find a JSON object in the text
                m = re.search(r"\{[\s\S]*\}", analysis_text)
                if m:
                    parsed = _json.loads(m.group(0))
                else:
                    # Last resort: try to interpret the whole text as JSON
                    parsed = _json.loads(analysis_text)

                # Normalize parsed result
                args = {
                    'genres': parsed.get('genres') or [],
                    'country': parsed.get('country'),
                    'year': parsed.get('year'),
                    'keyword': parsed.get('keyword')
                }
                analysis_result = {'type': 'tool', 'data': {'arguments': _json.dumps(args)}}
            except Exception as e:
                print(f"analysis parse error: {e}")
                analysis_result = None

        # --- BƯỚC 2: XỬ LÝ KẾT QUẢ TỪ AI ---
        used_strict_filter = False
        
        # TRƯỜNG HỢP A: AI phát hiện bộ lọc (VD: "Phim hoạt hình hành động Nhật")
        if analysis_result and analysis_result['type'] == 'tool':
            try:
                args = json.loads(analysis_result['data']['arguments'])
                print(f"AI Filters Detected: {args}") # Debug xem AI lọc gì

                queryset = Movie.objects.all().order_by('-views')

                # 1. Lọc Quốc gia
                if args.get('country'):
                    queryset = queryset.filter(country__name__icontains=args['country'])

                # 2. Lọc Thể loại (QUAN TRỌNG: Logic AND - Lọc lồng nhau)
                genres = args.get('genres', [])
                if genres:
                    for genre in genres:
                        # Mỗi lần loop là thu hẹp phạm vi lại (AND)
                        queryset = queryset.filter(categories__name__icontains=genre)

                # 3. Lọc Năm
                if args.get('year'):
                    queryset = queryset.filter(release_year=args['year'])
                
                # 4. Lọc keyword (nếu có)
                if args.get('keyword'):
                    queryset = queryset.filter(title__icontains=args['keyword'])

                # Lấy kết quả
                found_movies = queryset.distinct()[:8]
                
                # Chuyển đổi sang list dict
                for m in found_movies:
                    movies.append(self._format_movie(m))
                
                used_strict_filter = True
                
            except Exception as e:
                print(f"Filter Error: {e}")

        # TRƯỜNG HỢP B: AI không tìm thấy bộ lọc HOẶC kết quả rỗng -> Dùng Embeddings (Fallback)
        # (Ví dụ: "Phim nào xem buồn khóc?")
        if not movies:
            print("Using Embeddings Fallback...")
            encoder = self.get_encoder()
            tmdb_ids = []
            if encoder is not None and ChatAPIView.EMB_IDS.size:
                query_embedding = encoder.encode([message], convert_to_numpy=True)[0]
                ids_arr, sims = get_top_k(query_embedding, k=6)
                tmdb_ids = [int(x) for x in ids_arr.tolist()] if hasattr(ids_arr, "tolist") else []
            
            if tmdb_ids:
                # Dùng IN query để lấy phim từ embeddings
                qs = Movie.objects.filter(tmdb_id__in=tmdb_ids)
                # Sắp xếp lại theo thứ tự độ tương đồng (quan trọng)
                from django.db.models import Case, When
                preserved_order = Case(*[When(tmdb_id=pk, then=pos) for pos, pk in enumerate(tmdb_ids)])
                qs = qs.order_by(preserved_order)
                
                for m in qs:
                    movies.append(self._format_movie(m))

        # --- BƯỚC 3: TẠO CÂU TRẢ LỜI TỰ NHIÊN ---
        if not movies:
            return Response({
                "reply": "Xin lỗi, mình không tìm thấy phim nào phù hợp với yêu cầu cụ thể này. Bạn thử từ khóa khác xem sao nhé!", 
                "movies": []
            })

        # Xây dựng prompt để AI chém gió dựa trên list phim tìm được
        prompt_lines = [
            "Bạn là trợ lý gợi ý phim.",
            f"User hỏi: \"{message}\"",
            f"Hệ thống đã tìm thấy {len(movies)} phim phù hợp nhất:",
        ]
        for i, m in enumerate(movies, 1):
             prompt_lines.append(f"{i}. {m['title']} ({m['release_year']}) - {', '.join(m['categories'])}")
        
        prompt_lines.append("\nHãy viết câu trả lời ngắn gọn (tiếng Việt) giới thiệu các phim trên.")

        # Gọi OpenAI lần cuối để generate text (không dùng tools nữa)
        if openai_has_key():
             # Gọi hàm cũ (chat_completion) hoặc hàm mới đều được, miễn là ra text
             # Ở đây tôi giả sử bạn dùng hàm chat_completion thường cho việc generate text
            from .openai_client import chat_completion 
            msgs_final = [{"role": "user", "content": "\n".join(prompt_lines)}]
            ai_reply_text = chat_completion(msgs_final, max_tokens=300)
        else:
            ai_reply_text = f"Dựa trên yêu cầu, mình tìm thấy: {', '.join([m['title'] for m in movies])}."

        return Response({"reply": ai_reply_text, "movies": movies})

    def _format_movie(self, m):
        """Helper để format JSON phim"""
        return {
            "tmdb_id": m.tmdb_id,
            "title": m.title,
            "overview": (m.description or "")[:300],
            "release_year": m.release_year,
            "poster": m.poster,
            "categories": list(m.categories.values_list("name", flat=True))
        }

class EpisodeViewSet(viewsets.ModelViewSet):
    """API cho Admin quản lý (CRUD) các tập phim"""
    queryset = Episode.objects.all()
    serializer_class = EpisodeSerializer
    permission_classes = [IsAdminUser]

class AdminMovieViewSet(viewsets.ModelViewSet):
    """API cho Admin quản lý (CRUD) phim"""
    queryset = Movie.objects.all().order_by('-created_at')
    serializer_class = AdminMovieSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'tmdb_id', 'id']
    filterset_fields = ['id', 'tmdb_id']

class AdminCategoryViewSet(viewsets.ModelViewSet):
    """API cho Admin quản lý (CRUD) thể loại"""
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter]
    search_fields = ['name']
    pagination_class = StandardResultsSetPagination

class AdminActorViewSet(viewsets.ModelViewSet):
    """API cho Admin quản lý (CRUD) diễn viên"""
    queryset = Actor.objects.all().order_by('name')
    serializer_class = ActorSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter]
    search_fields = ['name']
    pagination_class = StandardResultsSetPagination

class AdminCountryViewSet(viewsets.ModelViewSet):
    """API cho Admin quản lý (CRUD) quốc gia"""
    queryset = Country.objects.all().order_by('name')
    serializer_class = CountrySerializer
    permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter]
    search_fields = ['name']
    pagination_class = StandardResultsSetPagination

class AdminUserViewSet(viewsets.ModelViewSet):
    """API cho Admin/Staff quản lý users - Admin thấy tất cả, Staff chỉ thấy user thường"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]  # Cho phép cả staff và admin
    filter_backends = [SearchFilter]
    search_fields = ['username', 'email', 'nickname']
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        """Filter users based on current user role"""
        user = self.request.user
        if user.is_superuser:
            # Admin thấy tất cả users
            return User.objects.all().order_by('-date_joined')
        elif user.is_staff:
            # Staff chỉ thấy các user thường (không phải staff/admin)
            return User.objects.filter(is_staff=False).order_by('-date_joined')
        else:
            # User thường không được truy cập
            return User.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new user with password"""
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def ban(self, request, pk=None):
        """Ban user"""
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'status': 'user banned'})

    @action(detail=True, methods=['post'])
    def unban(self, request, pk=None):
        """Unban user"""
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'status': 'user unbanned'})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset password"""
        user = self.get_object()
        from django.contrib.auth.hashers import make_password
        user.password = make_password('123456')
        user.save()
        return Response({'status': 'password reset', 'new_password': '123456'})

    @action(detail=True, methods=['get'])
    def watch_history(self, request, pk=None):
        """Get user watch history"""
        user = self.get_object()
        history = WatchHistory.objects.filter(user=user).order_by('-last_watched_at')[:50]
        data = [{
            'movie_title': item.movie.title,
            'movie_poster': item.movie.poster,
            'watched_at': item.last_watched_at,
            'progress': 100  # Default progress since field doesn't exist
        } for item in history]
        return Response(data)

class AdminCommentViewSet(viewsets.ModelViewSet):
    """API cho Admin quản lý comments - Chỉ superuser được truy cập"""
    queryset = Comment.objects.all().order_by('-created_at')
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CommentUpdateSerializer
        return AdminCommentSerializer
    
    @action(detail=True, methods=['post'])
    def delete_comment(self, request, pk=None):
        """Xóa comment và tất cả replies"""
        comment = self.get_object()
        
        # Xóa tất cả replies trước
        Comment.objects.filter(parent=comment).delete()
        
        # Xóa comment chính
        comment.delete()
        
        return Response({'status': 'comment deleted successfully'})
    
    @action(detail=True, methods=['post'])
    def approve_comment(self, request, pk=None):
        """Duyệt comment (nếu có hệ thống moderation)"""
        comment = self.get_object()
        # Có thể thêm field is_approved vào model Comment sau này
        return Response({'status': 'comment approved'})


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """API để lấy danh sách quốc gia"""
    queryset = Country.objects.all().order_by('name')
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]
    filter_backends = [SearchFilter, DjangoFilterBackend]
    search_fields = ['name']
    filterset_fields = ['name']
    pagination_class = None  # Disable pagination completely to return all countries


class YearViewSet(viewsets.ReadOnlyModelViewSet):
    """API để lấy danh sách năm phát hành phim"""
    permission_classes = [AllowAny]
    pagination_class = None  # Disable pagination completely to return all years
    
    def list(self, request):
        # Get distinct years from movies
        years = Movie.objects.values_list('release_year', flat=True).filter(
            release_year__isnull=False
        ).distinct().order_by('-release_year')
        
        # Convert to list of integers and filter valid years
        year_list = [int(year) for year in years if year and 1900 <= year <= 2030]
        
        return Response(year_list)
