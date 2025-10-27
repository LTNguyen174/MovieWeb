from django.urls import path
from .views import (
        MyFavoritesView, 
        MyCommentsView, 
        ChangePasswordView,
        RegisterView)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # Đăng nhập
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # Làm mới token
    path('profile/favorites/', MyFavoritesView.as_view(), name='my-favorites'),
    path('profile/comments/', MyCommentsView.as_view(), name='my-comments'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
]