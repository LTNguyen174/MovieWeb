from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MovieViewSet, CategoryViewSet, CommentViewSet,
    DashboardStatsView, FetchTMDBView, ImportTMDBView, ChatAPIView,
    AdminMovieViewSet, AdminCategoryViewSet, AdminActorViewSet, AdminCountryViewSet, AdminUserViewSet, AdminCommentViewSet
)

router = DefaultRouter()
router.register(r'movies', MovieViewSet, basename='movie')
router.register(r'categories', CategoryViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'admin/movies', AdminMovieViewSet, basename='admin-movie')
router.register(r'admin/categories', AdminCategoryViewSet, basename='admin-category')
router.register(r'admin/actors', AdminActorViewSet, basename='admin-actor')
router.register(r'admin/countries', AdminCountryViewSet, basename='admin-country')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')
router.register(r'admin/comments', AdminCommentViewSet, basename='admin-comment')

# Tạo danh sách URL cho Admin
admin_patterns = [
    path('stats/', DashboardStatsView.as_view(), name='admin-stats'),
    path('fetch-tmdb/', FetchTMDBView.as_view(), name='admin-fetch-tmdb'),
    path('import-tmdb/', ImportTMDBView.as_view(), name='admin-import-tmdb'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('chat/', ChatAPIView.as_view(), name='api-chat'),
    # Thêm path /api/admin/ vào trước các admin_patterns
    path('admin/', include(admin_patterns)),
]