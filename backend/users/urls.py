from django.urls import path
from .views import (
        MyFavoritesView, 
        MyCommentsView, 
        ChangePasswordView,
        RegisterView,
        MyHistoryView,
        ProfileView,
        GoogleOAuthView)
from .views_custom import CustomTokenObtainPairView
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'), # Custom login với username
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # Làm mới token
    path('google/', GoogleOAuthView.as_view(), name='google_oauth'),
    path('profile/', ProfileView.as_view(), name='profile-detail'),
    path('profile/favorites/', MyFavoritesView.as_view(), name='my-favorites'),
    path('profile/comments/', MyCommentsView.as_view(), name='my-comments'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('profile/history/', MyHistoryView.as_view(), name='my-history'),
]