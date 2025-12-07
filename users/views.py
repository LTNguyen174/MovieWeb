from rest_framework import generics, status # <-- Thêm status
from rest_framework.response import Response # <-- Thêm Response
from rest_framework.permissions import AllowAny, IsAuthenticated # <-- Thêm IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer
# Thêm các import mới
from .serializers import UserRatingSerializer, ChangePasswordSerializer, WatchHistorySerializer, UserProfileSerializer, FavoriteSerializer
from movies.serializers import CommentSerializer # Import từ app 'movies'
from movies.models import Rating, Comment, WatchHistory, Favorite # Import model từ app 'movies'
from .models import User
import requests
import json
import os

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,) # Cho phép ai cũng được đăng ký
    serializer_class = RegisterSerializer

# === THÊM CÁC VIEW MỚI NÀY VÀO ===

class MyFavoritesView(generics.ListAPIView):
    """
    API: GET /api/auth/profile/favorites/
    Trả về danh sách các phim mà user (đã đăng nhập) đã đánh dấu là yêu thích.
    Không yêu cầu rating - chỉ cần click trái tim để thêm vào favorites.
    """
    serializer_class = FavoriteSerializer
    permission_classes = [IsAuthenticated] # Chỉ user đã đăng nhập

    def get_queryset(self):
        # Trả về tất cả Favorite records của user hiện tại
        user = self.request.user
        return Favorite.objects.filter(user=user).order_by('-created_at')

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

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Không trả replies ở trang hồ sơ để hiển thị phẳng
        context['include_replies'] = False
        return context

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


class MyHistoryView(generics.ListAPIView):
    """
    API: GET /api/auth/profile/history/
    Trả về lịch sử xem phim của user đã đăng nhập.
    """
    serializer_class = WatchHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return WatchHistory.objects.filter(user=user).order_by('-last_watched_at')


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    API: GET/PUT/PATCH /api/auth/profile/
    Xem và cập nhật thông tin profile người dùng.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        user = self.request.user
        
        # Lưu avatar cũ để xóa sau khi update thành công
        old_avatar = None
        if user.avatar and 'avatar' in self.request.FILES:
            old_avatar = user.avatar
        
        # Cho phép partial update cho cả PUT/PATCH
        instance = serializer.save()
        
        # Nếu có upload avatar mới và update thành công, xóa file cũ khỏi storage
        if old_avatar and old_avatar.name != instance.avatar.name:
            try:
                old_avatar.delete(save=False)
            except Exception:
                # Ignore error nếu file không tồn tại hoặc không thể xóa
                pass


class GoogleOAuthView(APIView):
    """
    API: POST /api/auth/google/
    Xử lý Google OAuth login với authorization code
    """
    permission_classes = [AllowAny]

    def post(self, request):
        print("=== Google OAuth POST request received ===")
        code = request.data.get('code')
        print(f"Received Google OAuth request with code: {code[:20] if code else 'None'}...")
        
        if not code:
            print("Error: No authorization code provided")
            return Response(
                {'error': 'Authorization code is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Debug environment variables
            client_id_env = os.getenv('GOOGLE_OAUTH2_CLIENT_ID')
            client_secret_env = os.getenv('GOOGLE_OAUTH2_CLIENT_SECRET')
            
            print(f"Raw client_id_env: '{client_id_env}'")
            print(f"Raw client_secret_env: '{client_secret_env}'")
            
            # Remove quotes if present
            client_id = client_id_env.strip("'\"") if client_id_env else '78794365796-64kq0imn1movnsb5asil46etfd0pd21v.apps.googleusercontent.com'
            client_secret = client_secret_env.strip("'\"") if client_secret_env else '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'
            
            print(f"After strip - GOOGLE_CLIENT_ID: '{client_id}'")
            print(f"After strip - GOOGLE_CLIENT_SECRET: '{client_secret[:10]}...'")
            
            # Exchange authorization code for access token
            token_url = 'https://oauth2.googleapis.com/token'
            redirect_uri = 'http://localhost:3000/auth/google/callback'
            
            token_data = {
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code',
            }
            
            print(f"Sending to Google:")
            print(f"  client_id: {client_id}")
            print(f"  client_secret: {client_secret[:10]}...")
            print(f"  redirect_uri: {redirect_uri}")
            print(f"  code: {code[:20]}...")
            
            token_response = requests.post(token_url, data=token_data)
            token_response.raise_for_status()
            token_data = token_response.json()
            
            # Get user info from Google
            user_info_url = 'https://www.googleapis.com/oauth2/v2/userinfo'
            headers = {'Authorization': f'Bearer {token_data["access_token"]}'}
            user_info_response = requests.get(user_info_url, headers=headers)
            user_info_response.raise_for_status()
            user_info = user_info_response.json()
            
            # Get or create user with Google info
            email = user_info['email']
            google_name = user_info.get('name', '')  # Get Google display name
            username = google_name if google_name else email.split('@')[0]  # Keep original Google name
            
            # Create user with Google info
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'first_name': google_name.split()[0] if google_name and ' ' in google_name else google_name,
                    'last_name': ' '.join(google_name.split()[1:]) if google_name and ' ' in google_name else '',
                    'is_active': True,
                }
            )
            
            if not created:
                # User exists, update name if different
                if google_name and not user.first_name:
                    user.first_name = google_name.split()[0] if ' ' in google_name else google_name
                    user.last_name = ' '.join(google_name.split()[1:]) if ' ' in google_name else ''
                    user.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            })
            
        except requests.exceptions.RequestException as e:
            print(f"Google OAuth request error: {str(e)}")
            print(f"Response status: {e.response.status_code if hasattr(e, 'response') else 'No response'}")
            print(f"Response text: {e.response.text if hasattr(e, 'response') else 'No response text'}")
            
            error_msg = f'Google OAuth error: {str(e)}'
            if hasattr(e, 'response') and e.response.status_code == 400:
                error_msg = 'Invalid Google credentials or redirect URI'
            elif hasattr(e, 'response') and e.response.status_code == 401:
                error_msg = 'Invalid Google Client ID or Client Secret'
                
            return Response(
                {'error': error_msg}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"Server error in Google OAuth: {str(e)}")
            return Response(
                {'error': f'Server error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
