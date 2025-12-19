"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MovieCard } from "./movie-card"
import { moviesAPI, type Movie } from "@/lib/api"

interface RecommendationCarouselProps {
  movies?: Movie[]
  title?: string
  movieId?: number // ID của phim để lấy recommendations
}

export function RecommendationCarousel({ movies: propMovies, title = "Recommended For You", movieId }: RecommendationCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [movies, setMovies] = useState<Movie[]>(propMovies || [])
  const [loading, setLoading] = useState(!propMovies)

  useEffect(() => {
    // Nếu có movies từ props, không cần fetch
    if (propMovies) {
      setMovies(propMovies)
      return
    }

    // Fetch movies từ API
    async function fetchMovies() {
      try {
        setLoading(true)
        // Nếu có movieId, lấy recommendations, không thì lấy danh sách phim
        const data = movieId 
          ? await moviesAPI.getRecommendations(movieId)
          : await moviesAPI.getMovies()
        
        // Xử lý cả paginated response và array response
        let moviesList: Movie[] = []
        if (Array.isArray(data)) {
          moviesList = data
        } else if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
          // Nếu là paginated response (DRF format)
          moviesList = data.results
        } else {
          // Nếu format không đúng, log để debug
          console.warn("Unexpected API response format:", data)
          moviesList = []
        }
        
        // Chỉ lấy 8 phim đầu cho carousel, đảm bảo là array trước khi slice
        setMovies(Array.isArray(moviesList) ? moviesList.slice(0, 8) : [])
      } catch (err) {
        console.error("Failed to fetch movies:", err)
        setMovies([])
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [propMovies, movieId])

  const displayMovies = movies

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl md:text-3xl font-bold"
        >
          {title}
        </motion.h2>

        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full bg-transparent" onClick={() => scroll("left")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full bg-transparent" onClick={() => scroll("right")}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
      ) : displayMovies.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Không có phim nào</div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {displayMovies.map((movie, index) => (
            <div
              key={movie.tmdb_id}
              className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px]"
              style={{ scrollSnapAlign: "start" }}
            >
              <MovieCard movie={movie} index={index} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
