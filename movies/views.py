import requests # Thư viện để gọi API
from .tmdb_service import import_movie_from_tmdb
from django.conf import settings # Để lấy API Key
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, Count, Q
from users.models import User
from rest_framework import viewsets, generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
# CẬP NHẬT: Thêm Episode
from .models import Movie, Category, Rating, Comment, Actor, Country, Episode, WatchHistory, CommentReaction
from .serializers import (
    MovieSerializer, MovieDetailSerializer, CategorySerializer,
    CommentSerializer, RatingCreateSerializer, CommentCreateSerializer,
    EpisodeSerializer  # <-- THÊM MỚI (Bước 2)
)
# THÊM MỚI (Bước 4)
from .permissions import IsOwnerOrReadOnly

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().annotate(movie_count=Count('movies', distinct=True))
    serializer_class = CategorySerializer
    permission_classes = [AllowAny] # Ai cũng được xem

# === CLASS MOVIEVIEWSET ĐÃ ĐƯỢC GỘP VÀ CẬP NHẬT ===
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = 'page_size'
    max_page_size = 100

class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    # CẬP NHẬT (Bước 3): Sắp xếp theo lượt xem
    queryset = Movie.objects.all().order_by('-views') 

    lookup_field = 'tmdb_id'
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['categories', 'release_year'] 
    search_fields = ['title'] 
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == 'list':
            return MovieSerializer
        
        # Gộp từ MovieViewSet thứ 2 (đã bị xóa)
        if self.action == 'get_recommendations':
            return MovieSerializer 
            
        return MovieDetailSerializer

    @action(detail=True, methods=['get'])
    def comments(self, request, tmdb_id=None):
        movie = self.get_object()
        # Chỉ trả về bình luận cấp 1; replies sẽ nằm trong field 'replies'
        comments = movie.comments.filter(parent__isnull=True).order_by('-created_at')
        # SỬA: Dùng CommentSerializer đầy đủ để ĐỌC, kèm context
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    # === TMDB-powered collections ===
    def _collect_tmdb_movies(self, tmdb_ids, limit=10):
        collected = []
        for mid in tmdb_ids:
            try:
                movie_obj = Movie.objects.filter(tmdb_id=mid).first()
                if not movie_obj:
                    movie_obj, _ = import_movie_from_tmdb(mid, force_update=False, prefer_vi=True)
                collected.append(movie_obj)
                if len(collected) >= limit:
                    break
            except Exception:
                continue
        return collected

    @action(detail=False, methods=['get'], url_path='trending')
    def trending(self, request):
        """TMDB Trending: window=day|week (default: day), limit=10; fallback to new-releases if empty."""
        window = request.query_params.get('window', 'day')
        if window not in ('day', 'week'):
            window = 'day'
        limit = int(request.query_params.get('limit', 10))
        try:
            url = f"{settings.TMDB_BASE_URL}/trending/movie/{window}"
            params = { 'api_key': settings.TMDB_API_KEY }
            resp = requests.get(url, params=params)
            resp.raise_for_status()
            results = resp.json().get('results', [])
            ids = [r.get('id') for r in results if r.get('id')]
            movies = self._collect_tmdb_movies(ids, limit=limit)
            # Fallback: nếu không có phim, lấy từ new-releases (30 ngày gần đây)
            if not movies:
                from datetime import date, timedelta
                today = date.today()
                start = (today - timedelta(days=30)).isoformat()
                end = today.isoformat()
                disc_url = f"{settings.TMDB_BASE_URL}/discover/movie"
                disc_params = {
                    'api_key': settings.TMDB_API_KEY,
                    'language': 'vi-VN',
                    'sort_by': 'primary_release_date.desc',
                    'include_adult': 'false',
                    'include_video': 'false',
                    'primary_release_date.gte': start,
                    'primary_release_date.lte': end,
                    'with_release_type': '2|3',
                    'page': 1,
                }
                disc_resp = requests.get(disc_url, params=disc_params)
                if disc_resp.ok:
                    disc_results = disc_resp.json().get('results', [])
                    disc_ids = [r.get('id') for r in disc_results if r.get('id')]
                    movies = self._collect_tmdb_movies(disc_ids, limit=limit)
            data = MovieSerializer(movies, many=True, context={'request': request}).data
            return Response(data)
        except requests.RequestException as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['get'], url_path='popular')
    def popular(self, request):
        """TMDB Popular movies: limit=10"""
        limit = int(request.query_params.get('limit', 10))
        try:
            url = f"{settings.TMDB_BASE_URL}/movie/popular"
            params = { 'api_key': settings.TMDB_API_KEY, 'language': 'vi-VN' }
            resp = requests.get(url, params=params)
            resp.raise_for_status()
            results = resp.json().get('results', [])
            ids = [r.get('id') for r in results if r.get('id')]
            movies = self._collect_tmdb_movies(ids, limit=limit)
            data = MovieSerializer(movies, many=True, context={'request': request}).data
            return Response(data)
        except requests.RequestException as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['get'], url_path='new-releases')
    def new_releases(self, request):
        """New releases near today (last 30 days): limit=10"""
        limit = int(request.query_params.get('limit', 10))
        from datetime import date, timedelta
        today = date.today()
        start = (today - timedelta(days=30)).isoformat()
        end = today.isoformat()
        try:
            url = f"{settings.TMDB_BASE_URL}/discover/movie"
            params = {
                'api_key': settings.TMDB_API_KEY,
                'language': 'vi-VN',
                'sort_by': 'primary_release_date.desc',
                'include_adult': 'false',
                'include_video': 'false',
                'primary_release_date.gte': start,
                'primary_release_date.lte': end,
                'with_release_type': '2|3',
                'page': 1,
            }
            resp = requests.get(url, params=params)
            resp.raise_for_status()
            results = resp.json().get('results', [])
            ids = [r.get('id') for r in results if r.get('id')]
            movies = self._collect_tmdb_movies(ids, limit=limit)
            data = MovieSerializer(movies, many=True, context={'request': request}).data
            return Response(data)
        except requests.RequestException as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['get'], url_path='top-rated')
    def top_rated(self, request):
        """TMDB Top Rated movies: limit=10"""
        limit = int(request.query_params.get('limit', 10))
        try:
            url = f"{settings.TMDB_BASE_URL}/movie/top_rated"
            params = { 'api_key': settings.TMDB_API_KEY, 'language': 'vi-VN' }
            resp = requests.get(url, params=params)
            resp.raise_for_status()
            results = resp.json().get('results', [])
            ids = [r.get('id') for r in results if r.get('id')]
            movies = self._collect_tmdb_movies(ids, limit=limit)
            data = MovieSerializer(movies, many=True, context={'request': request}).data
            return Response(data)
        except requests.RequestException as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=False, methods=['get'], url_path='year')
    def by_year(self, request):
        """Movies by specific year (default 2025): limit=10"""
        try:
            year = int(request.query_params.get('year', 2025))
        except ValueError:
            return Response({'error': 'Invalid year'}, status=status.HTTP_400_BAD_REQUEST)
        limit = int(request.query_params.get('limit', 10))
        try:
            url = f"{settings.TMDB_BASE_URL}/discover/movie"
            params = {
                'api_key': settings.TMDB_API_KEY,
                'language': 'vi-VN',
                'sort_by': 'primary_release_date.desc',
                'include_adult': 'false',
                'include_video': 'false',
                'primary_release_year': year,
                'with_release_type': '2|3',
                'page': 1,
            }
            resp = requests.get(url, params=params)
            resp.raise_for_status()
            results = resp.json().get('results', [])
            ids = [r.get('id') for r in results if r.get('id')]
            movies = self._collect_tmdb_movies(ids, limit=limit)
            data = MovieSerializer(movies, many=True, context={'request': request}).data
            return Response(data)
        except requests.RequestException as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def rate(self, request, tmdb_id=None):
        movie = self.get_object() 
        user = request.user
        serializer = RatingCreateSerializer(data=request.data)
        if serializer.is_valid():
            stars = serializer.validated_data['stars']
            Rating.objects.update_or_create(
                user=user,
                movie=movie,
                defaults={'stars': stars}
            )
            return Response({'status': 'rating saved'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # === THÊM MỚI (Bước 3) ===
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def increment_view(self, request, tmdb_id=None):
        """
        Tăng lượt xem của phim lên 1.
        Frontend gọi POST /api/movies/<tmdb_id>/increment_view/
        """
        try:
            movie = self.get_object()
            movie.views += 1
            movie.save(update_fields=['views']) # Chỉ cập nhật cột 'views' cho hiệu quả
            return Response({'status': 'view incremented', 'total_views': movie.views})
        except Movie.DoesNotExist:
            return Response({'error': 'Movie not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='watch')
    def watch(self, request, tmdb_id=None):
        """Ghi lại lịch sử xem phim của user"""
        movie = self.get_object()
        user = request.user
        WatchHistory.objects.update_or_create(user=user, movie=movie)
        return Response({'status': 'watch recorded'}, status=status.HTTP_201_CREATED)

    # Gộp từ MovieViewSet thứ 2 (đã bị xóa)
    @action(detail=True, methods=['get'], url_path='recommendations')
    def get_recommendations(self, request, tmdb_id=None):
        try:
            movie = self.get_object() 
            category_ids = movie.categories.values_list('id', flat=True)
            if not category_ids.exists():
                return Response([], status=status.HTTP_200_OK) 

            recommended_movies = Movie.objects.filter(
                categories__id__in=category_ids 
            ).exclude(
                tmdb_id=tmdb_id 
            ).distinct()

            recommended_movies = recommended_movies.annotate(
                shared_categories_count=Count('categories', filter=Q(categories__id__in=category_ids))
            ).order_by(
                '-shared_categories_count', '-views' 
            )[:10] 

            serializer = self.get_serializer(recommended_movies, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Movie.DoesNotExist:
            return Response({'error': 'Movie not found'}, status=status.HTTP_404_NOT_FOUND)

# === CẬP NHẬT CLASS NÀY (Bước 4) ===
class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    # CẬP NHẬT: Phân quyền (chỉ chủ sở hữu mới được sửa/xóa)
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    # CẬP NHẬT: Dùng 2 serializer khác nhau
    def get_serializer_class(self):
        # Khi 'tạo' hoặc 'sửa' (create/update), dùng serializer Viết (rút gọn)
        if self.action == 'create' or self.action == 'update':
            return CommentCreateSerializer
        # Khi 'đọc' (list/retrieve), dùng serializer Đọc (để thấy username)
        return CommentSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='react')
    def react(self, request, pk=None):
        """User like/dislike a comment by sending { reaction: 'like' | 'dislike' }"""
        comment = self.get_object()
        reaction = request.data.get('reaction')
        if reaction not in [CommentReaction.LIKE, CommentReaction.DISLIKE]:
            return Response({'error': 'Invalid reaction'}, status=status.HTTP_400_BAD_REQUEST)
        CommentReaction.objects.update_or_create(user=request.user, comment=comment, defaults={'reaction': reaction})
        data = CommentSerializer(comment, context={'request': request}).data
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated], url_path='react')
    def remove_reaction(self, request, pk=None):
        comment = self.get_object()
        CommentReaction.objects.filter(user=request.user, comment=comment).delete()
        data = CommentSerializer(comment, context={'request': request}).data
        return Response(data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        tmdb_id = serializer.validated_data.pop('movie_tmdb_id')
        parent_id = serializer.validated_data.pop('parent_id', None)
        try:
            movie = Movie.objects.get(tmdb_id=tmdb_id)
        except Movie.DoesNotExist:
            raise ValidationError("Movie not found")
        parent = None
        if parent_id:
            try:
                parent = Comment.objects.get(id=parent_id, movie=movie)
            except Comment.DoesNotExist:
                raise ValidationError("Parent comment not found")
        serializer.save(user=self.request.user, movie=movie, parent=parent)

    
class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        user_count = User.objects.count()
        movie_count = Movie.objects.count()
        comment_count = Comment.objects.count()
        total_views_agg = Movie.objects.aggregate(total_views=Sum('views'))
        total_views = total_views_agg['total_views'] or 0
        stats = {
            'user_count': user_count,
            'movie_count': movie_count,
            'comment_count': comment_count,
            'total_views': total_views,
        }
        return Response(stats, status=status.HTTP_200_OK)


class FetchTMDBView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        search_query = request.query_params.get('search', None)
        if not search_query:
            return Response({'error': 'Missing search query'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            url = f"{settings.TMDB_BASE_URL}/search/movie"
            params = {
                'api_key': settings.TMDB_API_KEY,
                'query': search_query,
                'language': 'vi-VN' 
            }
            response = requests.get(url, params=params)
            response.raise_for_status() 
            data = response.json().get('results', [])
            simplified_results = [
                {
                    'tmdb_id': movie.get('id'),
                    'title': movie.get('title'),
                    'poster_path': movie.get('poster_path'),
                    'release_date': movie.get('release_date')
                } for movie in data
            ]
            return Response(simplified_results, status=status.HTTP_200_OK)
        except requests.RequestException as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# === GIỮ LẠI CLASS NÀY (Class đã refactor) ===
# (Class ImportTMDBView trùng lặp bị lỗi đã bị xóa)
class ImportTMDBView(APIView):
    permission_classes = [IsAdminUser]
    def post(self, request):
        tmdb_id = request.data.get('tmdb_id', None)
        if not tmdb_id:
            return Response({'error': 'Missing tmdb_id'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            movie, created = import_movie_from_tmdb(tmdb_id)
            if not created:
                return Response({'error': 'Movie already exists in database'}, status=status.HTTP_409_CONFLICT)
            serializer = MovieDetailSerializer(movie)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# === THÊM MỚI (Bước 2) ===
class EpisodeViewSet(viewsets.ModelViewSet):
    """
    API cho Admin quản lý (CRUD) các tập phim.
    Chỉ Admin mới có quyền truy cập.
    GET, POST /api/admin/episodes/
    GET, PUT, DELETE /api/admin/episodes/<id>/
    """
    queryset = Episode.objects.all()
    serializer_class = EpisodeSerializer
    permission_classes = [IsAdminUser] # Chỉ Admin được phép