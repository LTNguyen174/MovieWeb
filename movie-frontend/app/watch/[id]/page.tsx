"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Play, Plus, Share2, Heart, Calendar, Clock, Star, ArrowLeft, Eye } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { MovieCard } from "@/components/movie-card"
import { Tag } from "@/components/tag"
import { RatingStars } from "@/components/rating-stars"
import { CommentInputBox } from "@/components/comment-input-box"
import { CommentItem } from "@/components/comment-item"
import { RecommendationCarousel } from "@/components/recommendation-carousel"
import { ShareModal, useShareModal } from "@/components/share-modal"
import { VideoPlayer } from "@/components/video-player"
import { moviesAPI, commentsAPI, type MovieDetail, type Comment } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"

// Hàm convert YouTube URL sang embed URL
function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null

  // Nếu đã là embed URL
  if (url.includes("youtube.com/embed/")) {
    return url
  }

  // Nếu là watch URL: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=1&rel=0`
  }

  // Nếu là short URL: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&rel=0`
  }

  return null
}

export default function WatchPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { isOpen: isShareOpen, openModal: openShareModal, closeModal: closeShareModal } = useShareModal()
  const movieId = Number(params.id)
  const [userRating, setUserRating] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [movie, setMovie] = useState<MovieDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const viewIncrementedRef = useRef(false)

  // Increment view count - chỉ tăng 1 lần với useEffect riêng
  useEffect(() => {
    const incrementView = async () => {
      console.log("incrementView called, viewIncrementedRef.current:", viewIncrementedRef.current)
      if (!viewIncrementedRef.current && movieId) {
        try {
          console.log("Calling incrementView API for movieId:", movieId)
          const result = await moviesAPI.incrementView(movieId)
          console.log("incrementView API response:", result)
          viewIncrementedRef.current = true
          console.log("incrementView successful")
        } catch (err) {
          console.warn("Failed to increment view:", err)
        }
      }
    }
    
    incrementView()
  }, [movieId])

  // Fetch movie data từ API
  useEffect(() => {
    async function fetchMovieData() {
      if (!movieId || isNaN(movieId)) {
        setError("Invalid movie ID")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch movie details
        const movieData = await moviesAPI.getMovie(movieId)
        setMovie(movieData)
        // Prefill user's previous rating if available
        if (typeof (movieData as any).user_rating === 'number') {
          setUserRating((movieData as any).user_rating || 0)
        } else {
          setUserRating(0)
        }
        // Set favorite state
        setIsLiked((movieData as any).is_favorite || false)

        // Fetch comments
        const commentsData = await moviesAPI.getComments(movieId)
        setComments(commentsData)

        // Record watch history (requires auth). Ignore errors if not logged in.
        try {
          await moviesAPI.watch(movieId)
        } catch (err) {
          // Not logged in or backend not available; safe to ignore
        }
      } catch (err) {
        console.error("Failed to fetch movie:", err)
        setError("Không thể tải thông tin phim")
      } finally {
        setLoading(false)
      }
    }

    fetchMovieData()
  }, [movieId])

  const embedUrl = movie ? getYouTubeEmbedUrl(movie.trailer_url) : null

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-2xl font-bold mb-4">Đang tải...</div>
            <div className="text-muted-foreground">Vui lòng đợi trong giây lát</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-2xl font-bold mb-4 text-red-500">{error || "Không tìm thấy phim"}</div>
            <div className="text-muted-foreground mb-6">Phim có thể không tồn tại hoặc đã bị xóa</div>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Video Player Section */}
      <div className="w-full bg-black/90 pt-20 pb-8"> 
        {/* pt-20 = đẩy video xuống dưới cách navbar */}
        
        <div className="max-w-5xl mx-auto px-4 flex flex-col gap-4">

          {/* Nút Quay Lại - nằm ngoài video */}
          <Button
            onClick={() => router.push(`/movie/${movieId}`)}
            variant="secondary"
            size="sm"
            className="w-fit rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          {/* Cloud Video Player - Luôn ở trên cùng nếu có video_url */}
          {movie.video_url && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
              <VideoPlayer 
                src={movie.video_url}
                poster={movie.poster}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Nếu không có video_url thì hiển thị trailer ở trên */}
          {!movie.video_url && embedUrl && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${movie.title} - Trailer`}
              />
            </div>
          )}

          {/* Nếu không có cả hai */}
          {!movie.video_url && !embedUrl && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center px-4">
                  <div className="text-2xl font-bold mb-4 text-red-500">Không có trailer</div>
                  <div className="text-muted-foreground mb-6">Phim này chưa có trailer</div>
                  <Button onClick={() => router.push(`/movie/${movieId}`)} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Xem chi tiết phim
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>


      {/* Movie Content Section - Ở dưới */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="flex-shrink-0">
            <img
              src={movie.poster || "/placeholder.svg"}
              alt={movie.title}
              className="w-64 md:w-80 rounded-2xl shadow-2xl mx-auto lg:mx-0"
            />
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 pt-4"
          >
            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.categories.map((category) => (
                <Tag key={category.id} text={category.name} categoryId={category.id} />
              ))}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{movie.title}</h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{movie.release_year}</span>
              </div>
              {movie.average_rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{movie.average_rating.toFixed(1)}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{(movie.views || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground mb-8 leading-relaxed">{movie.description}</p>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 mb-8">
              <Button
                size="lg"
                className="rounded-full gap-2"
                onClick={() => {
                  if (movie.trailer_url) {
                    window.location.reload() // Reload để phát lại trailer
                  } else {
                    alert("Phim này chưa có trailer")
                  }
                }}
              >
                <Play className="w-5 h-5 fill-current" />
                Phát lại
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full bg-transparent"
                onClick={async () => {
                  // Check if user has rated 4+ stars
                  if (!userRating || userRating < 4) {
                    alert("Bạn phải đánh giá phim 4 sao trở lên mới có thể thêm vào yêu thích!")
                    return
                  }
                  
                  // Optimistic update - hiển thị tim ngay lập tức
                  const newIsLiked = !isLiked
                  setIsLiked(newIsLiked)
                  
                  try {
                    await moviesAPI.toggleFavorite(movieId)
                    // Giữ optimistic update state
                  } catch (err: any) {
                    console.error("Failed to toggle favorite:", err)
                    // Rollback nếu lỗi
                    setIsLiked(!newIsLiked)
                    if (err.message?.includes("4 stars or higher")) {
                      alert("Bạn phải đánh giá phim 4 sao trở lên mới có thể thêm vào yêu thích!")
                    } else {
                      alert("Không thể cập nhật yêu thích. Vui lòng đăng nhập.")
                    }
                  }
                }}
              >
                <Heart className={`w-5 h-5 ${isLiked ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="rounded-full bg-transparent"
                onClick={openShareModal}
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* User Rating */}
            <div className="p-6 rounded-2xl bg-card border border-border">
              <h3 className="font-semibold mb-3">Rate this movie</h3>
              <RatingStars
                rating={userRating}
                size="lg"
                onRate={async (rating) => {
                  setUserRating(rating)
                  try {
                    await moviesAPI.rateMovie(movieId, rating)
                  } catch (err) {
                    console.error("Failed to rate movie:", err)
                    alert("Không thể đánh giá phim. Vui lòng đăng nhập.")
                  }
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Trailer Section - Chỉ hiển thị khi có cả video_url và trailer_url */}
        {movie.video_url && embedUrl && (
          <motion.section 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.3 }} 
            className="mt-16"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Trailer</h2>
            </div>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${movie.title} - Trailer`}
              />
            </div>
          </motion.section>
        )}

        {/* Comments Section */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Comments</h2>

          <div className="mb-8">
            <CommentInputBox
              onSubmit={async (content) => {
                try {
                  await commentsAPI.createComment(movieId, content)
                  const refreshed = await moviesAPI.getComments(movieId)
                  setComments(refreshed)
                } catch (err) {
                  console.error("Failed to post comment:", err)
                  alert("Không thể đăng bình luận. Vui lòng đăng nhập.")
                }
              }}
            />
          </div>

          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Chưa có bình luận nào</div>
            ) : (
              comments.map((comment, index) => (
                <CommentItem
                  key={comment.id ?? `${comment.username}-${comment.created_at}-${index}`}
                  comment={comment}
                  index={index}
                  isOwner={comment.username === user?.username}
                  onEdit={async (id) => {
                    const newContent = prompt("Edit comment:")
                    if (newContent && newContent.trim()) {
                      try {
                        await commentsAPI.updateComment(id, newContent.trim())
                        const refreshed = await moviesAPI.getComments(movieId)
                        setComments(refreshed)
                      } catch (err) {
                        alert("Không thể sửa bình luận.")
                      }
                    }
                  }}
                  onDelete={async (id) => {
                    if (confirm("Bạn có chắc muốn xóa bình luận này?")) {
                      try {
                        await commentsAPI.deleteComment(id)
                        const refreshed = await moviesAPI.getComments(movieId)
                        setComments(refreshed)
                      } catch (err) {
                        alert("Không thể xóa bình luận.")
                      }
                    }
                  }}
                  onReply={async (parentId, content) => {
                    try {
                      await commentsAPI.createComment(movieId, content, parentId)
                      const refreshed = await moviesAPI.getComments(movieId)
                      setComments(refreshed)
                    } catch (err) {
                      alert("Không thể trả lời bình luận. Vui lòng đăng nhập.")
                    }
                  }}
                  onReact={async (id, reaction) => {
                    try {
                      if (reaction === null) {
                        const updated = await commentsAPI.removeReaction(id)
                        setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
                      } else {
                        const updated = await commentsAPI.react(id, reaction)
                        setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
                      }
                    } catch (err) {
                      alert("Không thể tương tác bình luận. Vui lòng đăng nhập.")
                    }
                  }}
                />
              ))
            )}
          </div>
        </motion.section>

        {/* Recommendations */}
        <section className="mt-16">
          <RecommendationCarousel title="You Might Also Like" movieId={movieId} />
        </section>
      </main>

      <Footer />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={closeShareModal}
        url={window.location.href}
        title={movie ? `${movie.title} (${movie.release_year}) - MovieWeb` : undefined}
        description={movie ? `Xem phim ${movie.title} (${movie.release_year}) full HD miễn phí tại MovieWeb - Thư viện phim online chất lượng cao` : undefined}
        poster={movie?.poster}
      />
    </div>
  )
}
