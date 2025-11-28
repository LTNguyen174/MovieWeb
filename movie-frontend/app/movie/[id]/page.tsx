"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useParams } from "next/navigation"
import { Play, Plus, Share2, Heart, Calendar, Clock, Star } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { RatingStars } from "@/components/rating-stars"
import { CommentItem } from "@/components/comment-item"
import { CommentInputBox } from "@/components/comment-input-box"
import { RecommendationCarousel } from "@/components/recommendation-carousel"
import { moviesAPI, commentsAPI, type MovieDetail, type Comment } from "@/lib/api"

export default function MovieDetailPage() {
  const params = useParams()
  const movieId = Number(params.id)
  const [userRating, setUserRating] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [movie, setMovie] = useState<MovieDetail | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

        // Fetch comments
        const commentsData = await moviesAPI.getComments(movieId)
        setComments(commentsData)

        // Increment view count
        try {
          await moviesAPI.incrementView(movieId)
        } catch (err) {
          // Ignore view increment errors
          console.warn("Failed to increment view:", err)
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
            <div className="text-muted-foreground">Phim có thể không tồn tại hoặc đã bị xóa</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Backdrop Hero */}
      <div className="relative h-[60vh] md:h-[70vh]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${movie.poster || "/placeholder.svg"}')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
      </div>

      {/* Movie Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-80 relative z-10">
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
                <span
                  key={category.id}
                  className="px-3 py-1 text-sm font-medium bg-primary/20 text-primary rounded-full border border-primary/30"
                >
                  {category.name}
                </span>
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
                    window.location.href = `/watch/${movieId}`
                  } else {
                    alert("Phim này chưa có trailer")
                  }
                }}
              >
                <Play className="w-5 h-5 fill-current" />
                Watch Now
              </Button>
              <Button size="lg" variant="secondary" className="rounded-full gap-2">
                <Plus className="w-5 h-5" />
                Add to List
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full bg-transparent"
                onClick={async () => {
                  const next = !isLiked
                  setIsLiked(next)
                  if (next) {
                    try {
                      // Mark as favorite by saving a 5-star rating
                      await moviesAPI.rateMovie(movieId, 5)
                    } catch (err) {
                      console.error("Failed to favorite movie:", err)
                      alert("Không thể thêm vào yêu thích. Vui lòng đăng nhập.")
                      setIsLiked(false)
                    }
                  }
                }}
              >
                <Heart className={`w-5 h-5 ${isLiked ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full bg-transparent">
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

        {/* Comments Section */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Comments</h2>

          <div className="mb-8">
            <CommentInputBox
              onSubmit={async (content) => {
                try {
                  await commentsAPI.createComment(movieId, content)
                  // Refetch to ensure IDs and latest list
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
                  comment={{
                    ...comment,
                    movie_title: comment.movie_title ?? movie.title,
                    movie_tmdb_id: comment.movie_tmdb_id ?? movieId,
                  }}
                  index={index}
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
    </div>
  )
}
