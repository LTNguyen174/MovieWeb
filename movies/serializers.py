from rest_framework import serializers
from .models import Movie, Category, Comment, Rating
from django.db.models import Avg

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name')

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

    class Meta:
        model = Movie
        fields = ('tmdb_id', 'title', 'description', 'poster', 'release_year', 
                  'categories', 'average_rating')

    def get_average_rating(self, obj):
        # 'ratings' là related_name từ model Rating
        avg = obj.ratings.aggregate(Avg('stars'))['stars__avg']
        return round(avg, 1) if avg else None

class CommentSerializer(serializers.ModelSerializer):
    # Hiển thị username thay vì user_id
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'username', 'content', 'created_at')

# Dùng cho việc user TẠO rating và comment
class RatingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ('stars',) # User chỉ cần gửi số sao

class CommentCreateSerializer(serializers.ModelSerializer):
    movie_tmdb_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Comment
        fields = ('movie_tmdb_id', 'content')