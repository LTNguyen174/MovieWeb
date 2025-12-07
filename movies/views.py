import requests
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

from .models import Movie, Category, Rating, Comment, Actor, Country, Episode, WatchHistory, CommentReaction, Favorite
from .serializers import (
    MovieSerializer, MovieDetailSerializer, CategorySerializer,
    CommentSerializer, RatingCreateSerializer, CommentCreateSerializer, CommentUpdateSerializer,
    EpisodeSerializer
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

    def get_queryset(self):
        queryset = Movie.objects.all().order_by('-views')
        
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
        
        # Tăng lượt xem
        movie.views += 1
        movie.save(update_fields=['views'])
        
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
        """Lấy phim trending (dựa trên lượt xem)"""
        window = request.GET.get('window', 'day')
        limit = int(request.GET.get('limit', 10))
        
        # Đơn giản: lấy phim có nhiều lượt xem nhất
        movies = Movie.objects.all().order_by('-views')[:limit]
        
        serializer = MovieSerializer(movies, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def new_releases(self, request):
        """Lấy phim mới nhất"""
        limit = int(request.GET.get('limit', 10))
        movies = Movie.objects.all().order_by('-created_at')[:limit]
        
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
        movie_id = self.request.query_params.get('movie', None)
        if movie_id and movie_id.isdigit():
            queryset = queryset.filter(movie_id=int(movie_id))
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
        stats = {
            'total_movies': Movie.objects.count(),
            'total_users': User.objects.count(),
            'total_ratings': Rating.objects.count(),
            'total_comments': Comment.objects.count(),
            'recent_movies': Movie.objects.order_by('-created_at')[:5].values('title', 'created_at'),
            'top_rated': Movie.objects.annotate(avg_rating=Avg('ratings__stars')).filter(avg_rating__isnull=False).order_by('-avg_rating')[:5].values('title', 'avg_rating'),
        }
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

class EpisodeViewSet(viewsets.ModelViewSet):
    """API cho Admin quản lý (CRUD) các tập phim"""
    queryset = Episode.objects.all()
    serializer_class = EpisodeSerializer
    permission_classes = [IsAdminUser]
