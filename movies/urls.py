
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MovieViewSet, CategoryViewSet, CommentViewSet,
    DashboardStatsView, FetchTMDBView, ImportTMDBView # Thêm các view mới
)

router = DefaultRouter()
router.register(r'movies', MovieViewSet, basename='movie')
router.register(r'categories', CategoryViewSet)
router.register(r'comments', CommentViewSet)

# Tạo danh sách URL cho Admin
admin_patterns = [
    path('stats/', DashboardStatsView.as_view(), name='admin-stats'),
    path('fetch-tmdb/', FetchTMDBView.as_view(), name='admin-fetch-tmdb'),
    path('import-tmdb/', ImportTMDBView.as_view(), name='admin-import-tmdb'),
]

urlpatterns = [
    path('', include(router.urls)),
    # Thêm path /api/admin/ vào trước các admin_patterns
    path('admin/', include(admin_patterns)),
]