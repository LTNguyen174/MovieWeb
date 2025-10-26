import requests # Thư viện để gọi API
from .tmdb_service import import_movie_from_tmdb
from django.conf import settings # Để lấy API Key
from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, Count, Q # <-- ĐÃ THÊM 'Q'
from users.models import User
from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from .models import Movie, Category, Rating, Comment, Actor, Country
from .serializers import (
    MovieSerializer, MovieDetailSerializer, CategorySerializer,
    CommentSerializer, RatingCreateSerializer, CommentCreateSerializer
)

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny] # Ai cũng được xem

class MovieViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Movie.objects.all()

    # Dùng 'tmdb_id' trong URL thay vì 'id' nội bộ
    lookup_field = 'tmdb_id'

    permission_classes = [IsAuthenticatedOrReadOnly]

    # Cấu hình Lọc và Tìm kiếm
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['categories', 'release_year'] # Lọc theo: ?categories=1
    search_fields = ['title'] # Tìm kiếm: ?search=avatar

    def get_serializer_class(self):
        # Nếu là hành động 'list' (xem danh sách) -> dùng serializer rút gọn
        if self.action == 'list':
            return MovieSerializer
        
        # Thêm điều kiện này: (từ MovieViewSet thứ 2)
        if self.action == 'get_recommendations':
            return MovieSerializer # Dùng serializer rút gọn
            
        # Nếu là 'retrieve' (xem chi tiết) -> dùng serializer đầy đủ
        return MovieDetailSerializer

    # API: GET /api/movies/<tmdb_id>/comments/
    # (Từ MovieViewSet thứ 1)
    @action(detail=True, methods=['get'])
    def comments(self, request, tmdb_id=None):
        movie = self.get_object() # Tự động tìm phim bằng tmdb_id
        comments = movie.comments.all().order_by('-created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    # API: POST /api/movies/<tmdb_id>/rate/
    # (Từ MovieViewSet thứ 1)
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def rate(self, request, tmdb_id=None):
        movie = self.get_object() # Lấy phim
        user = request.user
        serializer = RatingCreateSerializer(data=request.data)

        if serializer.is_valid():
            stars = serializer.validated_data['stars']

            # Lưu vào CSDL PostgreSQL
            Rating.objects.update_or_create(
                user=user,
                movie=movie,
                defaults={'stars': stars}
            )
            return Response({'status': 'rating saved'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # API: GET /api/movies/<tmdb_id>/recommendations/
    # (Từ MovieViewSet thứ 2 - ĐÃ GỘP VÀO ĐÂY)
    @action(detail=True, methods=['get'], url_path='recommendations')
    def get_recommendations(self, request, tmdb_id=None):
        """
        Gợi ý phim dựa trên các thể loại chung (content-based).
        """
        try:
            # 1. Lấy phim gốc
            movie = self.get_object() # Tự tìm bằng tmdb_id

            # 2. Lấy danh sách ID thể loại của phim gốc
            category_ids = movie.categories.values_list('id', flat=True)
            if not category_ids.exists():
                return Response([], status=status.HTTP_200_OK) # Không có thể loại, không gợi ý

            # 3. Tìm các phim khác
            recommended_movies = Movie.objects.filter(
                categories__id__in=category_ids # Lọc phim có chung thể loại
            ).exclude(
                tmdb_id=tmdb_id # Loại trừ chính nó
            ).distinct()

            # 4. Xếp hạng gợi ý:
            # Đếm xem mỗi phim chia sẻ bao nhiêu thể loại chung
            recommended_movies = recommended_movies.annotate(
                shared_categories_count=Count('categories', filter=Q(categories__id__in=category_ids))
            ).order_by(
                '-shared_categories_count', '-views' # Ưu tiên phim có nhiều thể loại chung nhất và nhiều view nhất
            )[:10] # Lấy 10 phim

            serializer = self.get_serializer(recommended_movies, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Movie.DoesNotExist:
            return Response({'error': 'Movie not found'}, status=status.HTTP_404_NOT_FOUND)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentCreateSerializer
    permission_classes = [IsAuthenticated] # Chỉ user đăng nhập mới được comment

    def perform_create(self, serializer):
        # Tìm phim dựa trên 'movie_tmdb_id' gửi lên
        tmdb_id = serializer.validated_data.pop('movie_tmdb_id')
        try:
            movie = Movie.objects.get(tmdb_id=tmdb_id)
        except Movie.DoesNotExist:
            raise ValidationError("Movie not found")

        # Tự động gán user và movie (đã tìm được)
        serializer.save(user=self.request.user, movie=movie)

    
class DashboardStatsView(APIView):
    """
    API trả về các số liệu thống kê cho trang Admin Dashboard.
    """
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
    """
    API cho Admin tìm kiếm phim trên TMDB.
    """
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
                'language': 'vi-VN' # Lấy kết quả tiếng Việt
            }
            response = requests.get(url, params=params)
            response.raise_for_status() # Báo lỗi nếu API key sai hoặc TMDB sập

            data = response.json().get('results', [])

            # Chỉ trả về thông tin cần thiết, không trả về toàn bộ JSON
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


class ImportTMDBView(APIView):
    """
    API cho Admin nhập phim từ TMDB ID vào CSDL PostgreSQL.
    (Đã được refactor để dùng tmdb_service)
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        tmdb_id = request.data.get('tmdb_id', None)
        if not tmdb_id:
            return Response({'error': 'Missing tmdb_id'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Gọi service để thực hiện công việc
            movie, created = import_movie_from_tmdb(tmdb_id)

            if not created:
                # Nếu phim đã tồn tại
                return Response({'error': 'Movie already exists in database'}, status=status.HTTP_409_CONFLICT)
            
            # Nếu phim vừa được tạo thành công
            serializer = MovieDetailSerializer(movie)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            # Bắt lỗi từ service (Vd: TMDB sập)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
