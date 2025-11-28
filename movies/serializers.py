from rest_framework import serializers
from .models import Movie, Category, Comment, Rating, Episode
from django.db.models import Avg, Count, Q

class CategorySerializer(serializers.ModelSerializer):
    movie_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'name', 'movie_count')

class MovieSerializer(serializers.ModelSerializer):
    """Serializer rút gọn cho danh sách phim."""
    categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = ('title', 'poster', 'release_year', 'tmdb_id', 'categories')

class MovieDetailSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ cho trang chi tiết."""
    categories = CategorySerializer(many=True, read_only=True)
    average_rating = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        fields = ('tmdb_id', 'title', 'description', 'poster', 'release_year', 
                  'categories', 'average_rating', 'user_rating', 'trailer_url')

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

class CommentSerializer(serializers.ModelSerializer):
    # Hiển thị username thay vì user_id
    username = serializers.CharField(source='user.username', read_only=True)
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    movie_tmdb_id = serializers.IntegerField(source='movie.tmdb_id', read_only=True)
    parent_username = serializers.CharField(source='parent.user.username', read_only=True, default=None)
    likes_count = serializers.SerializerMethodField()
    dislikes_count = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            'id', 'username', 'content', 'created_at',
            'movie_title', 'movie_tmdb_id', 'parent_username',
            'likes_count', 'dislikes_count', 'user_reaction',
            'replies'
        )

    def get_likes_count(self, obj):
        return obj.reactions.filter(reaction='like').count()

    def get_dislikes_count(self, obj):
        return obj.reactions.filter(reaction='dislike').count()

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            r = obj.reactions.filter(user=request.user).first()
            return r.reaction if r else None
        return None

    def get_replies(self, obj):
        # Cho phép tắt trả về replies thông qua context
        include_replies = self.context.get('include_replies', True)
        if not include_replies:
            return []
        # Trả về replies level 1
        children = obj.replies.all().order_by('-created_at')
        return CommentSerializer(children, many=True, context=self.context).data

# Dùng cho việc user TẠO rating và comment
class RatingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ('stars',) # User chỉ cần gửi số sao

class CommentCreateSerializer(serializers.ModelSerializer):
    movie_tmdb_id = serializers.IntegerField(write_only=True)
    parent_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Comment
        fields = ('movie_tmdb_id', 'content', 'parent_id')
class EpisodeSerializer(serializers.ModelSerializer):
    """
    Serializer cho Admin quản lý tập phim.
    Admin sẽ dùng ID nội bộ (PK) của Movie để tạo tập.
    """
    class Meta:
        model = Episode
        # 'movie' ở đây là ID nội bộ (1, 2, 3...), không phải tmdb_id
        fields = ('id', 'movie', 'episode_number', 'title', 'video_url')