from rest_framework import serializers
from .models import User
# Thêm import cho các model và serializer từ app 'movies'
from movies.models import Rating, Comment, Favorite
from movies.serializers import MovieSerializer, CommentSerializer
from movies.models import WatchHistory

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def create(self, validated_data):
        # Hash mật khẩu
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

# === THÊM CÁC SERIALIZER MỚI NÀY VÀO ===

class UserRatingSerializer(serializers.ModelSerializer):
    """
    Serializer cho API "Danh sách yêu thích của tôi".
    Nó sẽ hiển thị chi tiết phim (lồng nhau) mà user đã đánh giá.
    """
    # Dùng MovieSerializer (lồng nhau) để hiển thị chi tiết phim
    movie = MovieSerializer(read_only=True) 

    class Meta:
        model = Rating
        fields = ('movie', 'stars', 'created_at') # Các trường bạn muốn hiển thị


class FavoriteSerializer(serializers.ModelSerializer):
    """
    Serializer cho Danh sách Favorites của user.
    Trả về Movie objects từ Favorite model mà không yêu cầu Rating.
    """
    movie = MovieSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ('movie', 'created_at')

class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer cho chức năng đổi mật khẩu.
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        # Kiểm tra xem 2 mật khẩu mới có khớp nhau không
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Hai mật khẩu mới không khớp."})
        
        # (Bạn có thể thêm logic validate độ mạnh mật khẩu ở đây)

        return attrs


class WatchHistorySerializer(serializers.ModelSerializer):
    movie = MovieSerializer(read_only=True)

    class Meta:
        model = WatchHistory
        fields = ("movie", "last_watched_at")


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer cho việc xem/cập nhật profile user.
    Cho phép chỉnh: username, nickname, date_of_birth, country, avatar.
    """
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ("username", "email", "nickname", "date_of_birth", "country", "avatar", "date_joined")
        read_only_fields = ("username", "email", "date_joined")

    def to_representation(self, instance):
        """
        Trả về avatar dưới dạng absolute URL để frontend Next.js load đúng từ backend.
        """
        data = super().to_representation(instance)
        request = self.context.get("request")
        avatar_path = data.get("avatar")
        if avatar_path and request is not None:
            data["avatar"] = request.build_absolute_uri(avatar_path)
        elif not avatar_path:
            data["avatar"] = None
        return data