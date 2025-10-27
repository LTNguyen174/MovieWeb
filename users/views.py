from rest_framework import generics, status # <-- Thêm status
from rest_framework.response import Response # <-- Thêm Response
from rest_framework.permissions import AllowAny, IsAuthenticated # <-- Thêm IsAuthenticated
from .serializers import RegisterSerializer
# Thêm các import mới
from .serializers import UserRatingSerializer, ChangePasswordSerializer
from movies.serializers import CommentSerializer # Import từ app 'movies'
from movies.models import Rating, Comment # Import model từ app 'movies'
from .models import User

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,) # Cho phép ai cũng được đăng ký
    serializer_class = RegisterSerializer

# === THÊM CÁC VIEW MỚI NÀY VÀO ===

class MyFavoritesView(generics.ListAPIView):
    """
    API: GET /api/auth/profile/favorites/
    Trả về danh sách các phim mà user (đã đăng nhập) đã đánh giá.
    """
    serializer_class = UserRatingSerializer
    permission_classes = [IsAuthenticated] # Chỉ user đã đăng nhập

    def get_queryset(self):
        # Lọc ra các Rating chỉ thuộc về user đang gửi request
        user = self.request.user
        return Rating.objects.filter(user=user).order_by('-created_at')

class MyCommentsView(generics.ListAPIView):
    """
    API: GET /api/auth/profile/comments/
    Trả về danh sách các bình luận mà user (đã đăng nhập) đã viết.
    """
    serializer_class = CommentSerializer # Dùng lại CommentSerializer từ app 'movies'
    permission_classes = [IsAuthenticated] # Chỉ user đã đăng nhập

    def get_queryset(self):
        # Lọc ra các Comment chỉ thuộc về user đang gửi request
        user = self.request.user
        return Comment.objects.filter(user=user).order_by('-created_at')

class ChangePasswordView(generics.UpdateAPIView):
    """
    API: PUT /api/auth/profile/change-password/
    Cho phép user (đã đăng nhập) thay đổi mật khẩu của họ.
    """
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self, queryset=None):
        # Trả về chính user đang đăng nhập
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            # 1. Kiểm tra mật khẩu cũ
            old_password = serializer.validated_data.get('old_password')
            if not user.check_password(old_password):
                return Response({"old_password": ["Mật khẩu cũ không đúng."]}, 
                                status=status.HTTP_400_BAD_REQUEST)
            
            # 2. Đặt mật khẩu mới (đã validate là khớp nhau trong serializer)
            new_password = serializer.validated_data.get('new_password')
            user.set_password(new_password) # Hàm này tự động hash mật khẩu
            user.save()
            
            return Response({"status": "Đổi mật khẩu thành công."}, 
                            status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
