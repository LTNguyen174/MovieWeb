from rest_framework import serializers
from .models import Movie, Category, Comment, Rating, Episode, Country, Actor, Favorite
from django.db.models import Avg, Count, Q
from django.contrib.auth import get_user_model

User = get_user_model()

class CategorySerializer(serializers.ModelSerializer):
    movie_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'name', 'movie_count')

class ActorSerializer(serializers.ModelSerializer):
    movie_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Actor
        fields = ('id', 'name', 'movie_count')

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ('id', 'name')

class UserSerializer(serializers.ModelSerializer):
    last_login = serializers.DateTimeField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'nickname', 'is_active', 'is_staff', 'is_superuser',
                 'date_joined', 'last_login', 'country', 'date_of_birth', 'avatar')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'is_staff', 'is_superuser')
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,
            is_staff=validated_data.get('is_staff', False),
            is_superuser=validated_data.get('is_superuser', False),
            is_active=True
        )
        return user

class CommentSerializer(serializers.ModelSerializer):
    """Serializer cho comment management"""
    username = serializers.CharField(source='user.username', read_only=True)
    nickname = serializers.CharField(source='user.nickname', read_only=True)
    avatar = serializers.CharField(source='user.avatar', read_only=True)
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    movie_tmdb_id = serializers.IntegerField(source='movie.tmdb_id', read_only=True)
    movie_poster = serializers.CharField(source='movie.poster', read_only=True)
    parent_username = serializers.CharField(source='parent.user.username', read_only=True, allow_null=True)
    parent_nickname = serializers.CharField(source='parent.user.nickname', read_only=True, allow_null=True)
    likes_count = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ('user', 'movie', 'created_at')
    
    def get_likes_count(self, obj):
        return obj.reactions.filter(reaction='like').count()
    
    def get_dislikes_count(self, obj):
        return obj.reactions.filter(reaction='dislike').count()
    
    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            reaction = obj.reactions.filter(user=request.user).first()
            return reaction.reaction if reaction else None
        return None
    
    def get_replies(self, obj):
        """Get all replies for this comment"""
        include_replies = self.context.get('include_replies', True)
        if not include_replies:
            return []
        
        replies = obj.replies.all().order_by('created_at')
        return CommentSerializer(replies, many=True, context=self.context).data

class AdminCommentSerializer(serializers.ModelSerializer):
    """Serializer cho admin comment management với đầy đủ thông tin"""
    user = UserSerializer(read_only=True)
    movie = serializers.SerializerMethodField()
    parent = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ('id', 'content', 'created_at', 'user', 'movie', 'parent')
    
    def get_movie(self, obj):
        return {
            'id': obj.movie.id,
            'title': obj.movie.title,
            'poster': obj.movie.poster,
            'tmdb_id': obj.movie.tmdb_id
        }
    
    def get_parent(self, obj):
        if obj.parent:
            return {
                'id': obj.parent.id,
                'content': obj.parent.content,
                'user': {
                    'username': obj.parent.user.username,
                    'nickname': obj.parent.user.nickname
                }
            }
        return None

class MovieSerializer(serializers.ModelSerializer):
    """Serializer rút gọn cho danh sách phim."""
    categories = CategorySerializer(many=True, read_only=True)
    country = serializers.StringRelatedField(read_only=True)
    average_rating = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    views = serializers.IntegerField(read_only=True)

    class Meta:
        model = Movie
        fields = ('title', 'poster', 'release_year', 'tmdb_id', 'categories', 'country', 'description', 'average_rating', 'is_favorite', 'views')

    def get_average_rating(self, obj):
        avg = obj.ratings.aggregate(Avg('stars'))['stars__avg']
        return round(avg, 1) if avg else None

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            from .models import Favorite
            return Favorite.objects.filter(user=request.user, movie=obj).exists()
        return False

class MovieDetailSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ cho trang chi tiết."""
    categories = CategorySerializer(many=True, read_only=True)
    country = serializers.StringRelatedField(read_only=True)
    average_rating = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    views = serializers.IntegerField(read_only=True)

    class Meta:
        model = Movie
        fields = ('tmdb_id', 'title', 'description', 'poster', 'release_year', 
                  'categories', 'country', 'average_rating', 'user_rating', 'is_favorite', 'trailer_url', 'views')

    def get_average_rating(self, obj):
        # 'ratings' là related_name từ model Rating
        avg = obj.ratings.aggregate(Avg('stars'))['stars__avg']
        return round(avg, 1) if avg else None

    def get_user_rating(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            r = obj.ratings.filter(user=request.user).first()
            return r.stars if r else None
        return None

    def get_is_favorite(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            # Check if user has marked this movie as favorite
            from .models import Favorite
            return Favorite.objects.filter(user=request.user, movie=obj).exists()
        return False

class CommentCreateSerializer(serializers.ModelSerializer):
    movie_tmdb_id = serializers.IntegerField(write_only=True)
    parent_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Comment
        fields = ('movie_tmdb_id', 'content', 'parent_id')

    def create(self, validated_data):
        movie_tmdb_id = validated_data.pop('movie_tmdb_id')
        parent_id = validated_data.pop('parent_id', None)
        
        try:
            movie = Movie.objects.get(tmdb_id=movie_tmdb_id)
        except Movie.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Movie with this TMDB ID does not exist")
        
        comment = Comment.objects.create(
            movie=movie,
            parent_id=parent_id,
            **validated_data
        )
        return comment

class CommentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ('content',)

class RatingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ('stars',) # User chỉ cần gửi số sao

class EpisodeSerializer(serializers.ModelSerializer):
    """
    Serializer cho Admin quản lý tập phim.
    Admin sẽ dùng ID nội bộ (PK) của Movie để tạo tập.
    """
    class Meta:
        model = Episode
        # 'movie' ở đây là ID nội bộ (1, 2, 3...), không phải tmdb_id
        fields = ('id', 'movie', 'episode_number', 'title', 'video_url')

class AdminMovieSerializer(serializers.ModelSerializer):
    """Serializer cho Admin CRUD phim"""
    categories = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), many=True)
    country = serializers.PrimaryKeyRelatedField(queryset=Country.objects.all(), allow_null=True)
    actors = serializers.PrimaryKeyRelatedField(queryset=Actor.objects.all(), many=True, required=False)

    def validate(self, attrs):
        # Handle country field - accept both ID and name
        country_value = attrs.get('country')
        if country_value:
            if isinstance(country_value, str):
                # Try to find country by name
                try:
                    country = Country.objects.get(name__iexact=country_value)
                    attrs['country'] = country
                except Country.DoesNotExist:
                    raise serializers.ValidationError(f"Country '{country_value}' not found")
            elif isinstance(country_value, int):
                # ID provided, validate it exists
                try:
                    country = Country.objects.get(id=country_value)
                    attrs['country'] = country
                except Country.DoesNotExist:
                    raise serializers.ValidationError(f"Country with ID {country_value} not found")
        
        return super().validate(attrs)

    def create(self, validated_data):
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

    class Meta:
        model = Movie
        fields = '__all__'