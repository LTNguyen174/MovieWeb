from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify  # <-- ĐÃ THÊM IMPORT

# ==================================
# MODELS HỖ TRỢ (Phân loại)
# ==================================

class Category(models.Model):
    """Thể loại phim (Vd: Hành động, Tình cảm)"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    
    def __str__(self):
        return self.name

    # === ĐÃ THÊM HÀM NÀY ĐỂ SỬA LỖI ===
    def save(self, *args, **kwargs):
        if not self.slug:  # Nếu slug đang rỗng
            self.slug = slugify(self.name)  # Tự động tạo slug từ name
        super().save(*args, **kwargs)  # Gọi hàm save gốc

    class Meta:
        verbose_name_plural = "Categories"

class Country(models.Model):
    """Quốc gia sản xuất"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)
    
    def __str__(self):
        return self.name

    # === ĐÃ THÊM HÀM NÀY ĐỂ SỬA LỖI ===
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    class Meta:
        verbose_name_plural = "Countries"

class Actor(models.Model):
    """Diễn viên"""
    name = models.CharField(max_length=255, unique=True)
    
    def __str__(self):
        return self.name

# ==================================
# MODEL CHÍNH (Phim)
# ==================================

class Movie(models.Model):
    """Model trung tâm lưu trữ thông tin phim"""
    
    # ID nội bộ (PK) của Postgres (Vd: 1, 2, 3...)
    # (Django tự động thêm trường này)
    
    # ID từ The Movie Database (TMDB)
    tmdb_id = models.IntegerField(
        unique=True, 
        db_index=True, 
        help_text="ID của phim từ TMDB"
    )
    
    # Thông tin cơ bản
    title = models.CharField(max_length=255)
    original_title = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField()
    poster = models.URLField(max_length=500, null=True, blank=True, help_text="Link URL đến poster")
    banner = models.URLField(max_length=500, null=True, blank=True, help_text="Link URL đến banner")
    release_year = models.IntegerField(null=True, blank=True)
    duration = models.IntegerField(null=True, blank=True, help_text="Thời lượng tính bằng phút")
    status = models.CharField(max_length=50, null=True, blank=True, help_text="Vd: Đang chiếu, Hoàn thành")
    trailer_url = models.URLField(max_length=500, null=True, blank=True)

    # Thông tin theo dõi
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # === Relationships (Quan hệ) ===
    categories = models.ManyToManyField(
        Category, 
        related_name='movies', 
        blank=True
    )
    country = models.ForeignKey(
        Country, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='movies'
    )
    actors = models.ManyToManyField(
        Actor, 
        related_name='movies', 
        blank=True
    )

    class Meta:
        ordering = ['-created_at'] # Phim mới nhất lên đầu

    def __str__(self):
        return f"{self.title} ({self.release_year})"

# ==================================
# MODEL TẬP PHIM
# ==================================

class Episode(models.Model):
    """Model lưu các tập phim (cho phim bộ)"""
    movie = models.ForeignKey(
        Movie, 
        on_delete=models.CASCADE, 
        related_name='episodes' # Rất quan trọng cho API
    )
    episode_number = models.PositiveIntegerField()
    title = models.CharField(max_length=255, null=True, blank=True)
    video_url = models.URLField(max_length=1000)
    
    class Meta:
        ordering = ['episode_number'] # Sắp xếp tập 1, 2, 3...
        unique_together = ('movie', 'episode_number') # 1 phim không thể có 2 tập 1

    def __str__(self):
        return f"{self.movie.title} - Tập {self.episode_number}"

# ==================================
# MODELS HÀNH VI NGƯỜI DÙNG
# ==================================

class Rating(models.Model):
    """Lưu trữ đánh giá (sao) của người dùng cho phim"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE
    )
    movie = models.ForeignKey(
        Movie, 
        on_delete=models.CASCADE, 
        related_name='ratings' # Rất quan trọng để tính trung bình
    )
    stars = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Mỗi user chỉ được đánh giá 1 phim 1 lần
        unique_together = ('user', 'movie')

    def __str__(self):
        return f"{self.user.username} - {self.movie.title}: {self.stars} sao"

class Comment(models.Model):
    """Lưu trữ bình luận của người dùng"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE
    )
    movie = models.ForeignKey(
        Movie, 
        on_delete=models.CASCADE, 
        related_name='comments' # Rất quan trọng
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Cho phép trả lời bình luận (nested comments)
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='replies'
    )

    class Meta:
        ordering = ['-created_at'] # Bình luận mới nhất lên đầu

    def __str__(self):
        return f"Comment của {self.user.username} trên {self.movie.title}"


# === NEW: Watch History ===
class WatchHistory(models.Model):
    """Lưu lịch sử xem phim của người dùng"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='watch_history'
    )
    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,
        related_name='watched_by'
    )
    last_watched_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'movie')
        ordering = ['-last_watched_at']

    def __str__(self):
        return f"{self.user.username} watched {self.movie.title} at {self.last_watched_at}"


class Favorite(models.Model):
    """Lưu trữ danh sách phim yêu thích của người dùng (tách biệt với rating)"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='favorites'
    )
    movie = models.ForeignKey(
        Movie, 
        on_delete=models.CASCADE, 
        related_name='favorited_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'movie')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} favorited {self.movie.title}"

# === NEW: Comment Reaction (Like/Dislike) ===
class CommentReaction(models.Model):
    LIKE = 'like'
    DISLIKE = 'dislike'
    REACTION_CHOICES = (
        (LIKE, 'Like'),
        (DISLIKE, 'Dislike'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comment_reactions')
    comment = models.ForeignKey('Comment', on_delete=models.CASCADE, related_name='reactions')
    reaction = models.CharField(max_length=7, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'comment')

    def __str__(self):
        return f"{self.user.username} {self.reaction} comment {self.comment_id}"
