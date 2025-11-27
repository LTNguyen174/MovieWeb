"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { MovieCard } from "./movie-card"
import { moviesAPI, type Movie } from "@/lib/api"

interface MovieGridProps {
  movies?: Movie[]
  title?: string
  searchQuery?: string
  categoryId?: number | null
  releaseYear?: number | null
  pageSize?: number
  enablePagination?: boolean
}

export function MovieGrid({ movies: propMovies, title, searchQuery, categoryId, releaseYear, pageSize = 30, enablePagination = false }: MovieGridProps) {
  const [movies, setMovies] = useState<Movie[]>(propMovies || [])
  const [loading, setLoading] = useState(!propMovies)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const totalPages = totalCount ? Math.max(1, Math.ceil(totalCount / pageSize)) : null

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, categoryId, releaseYear])

  useEffect(() => {
    // Nếu có movies từ props VÀ không có search/filter, dùng propMovies
    // Nếu có search/filter, luôn fetch từ API
    const hasFilters = searchQuery || categoryId || releaseYear
    
    if (propMovies && !hasFilters) {
      setMovies(propMovies)
      setLoading(false)
      setTotalCount(propMovies.length)
      return
    }

    // Fetch movies từ API
    async function fetchMovies() {
      try {
        setLoading(true)
        setError(null)
        const data = await moviesAPI.getMovies({
          search: searchQuery,
          categories: categoryId || undefined,
          release_year: releaseYear || undefined,
          page: enablePagination ? page : undefined,
          page_size: enablePagination ? pageSize : undefined,
        })
        
        // Xử lý cả paginated response và array response
        let moviesList: Movie[] = []
        if (Array.isArray(data)) {
          moviesList = data
          setTotalCount(data.length)
        } else if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
          // Nếu là paginated response (DRF format)
          moviesList = data.results
          if (typeof data.count === 'number') setTotalCount(data.count)
        } else {
          // Nếu format không đúng, log để debug
          console.warn("Unexpected API response format:", data)
          moviesList = []
          setTotalCount(0)
        }
        
        setMovies(Array.isArray(moviesList) ? moviesList : [])
      } catch (err) {
        console.error("Failed to fetch movies:", err)
        setError("Không thể tải danh sách phim")
        setMovies([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [propMovies, searchQuery, categoryId, releaseYear, page, pageSize, enablePagination])

  if (loading) {
    return (
      <section className="py-8">
        {title && <h2 className="text-2xl md:text-3xl font-bold mb-6">{title}</h2>}
        <div className="text-center py-8 text-muted-foreground">Đang tải phim...</div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-8">
        {title && <h2 className="text-2xl md:text-3xl font-bold mb-6">{title}</h2>}
        <div className="text-center py-8 text-red-500">{error}</div>
      </section>
    )
  }

  if (movies.length === 0 && !loading) {
    return (
      <section className="py-8">
        {title && <h2 className="text-2xl md:text-3xl font-bold mb-6">{title}</h2>}
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || categoryId || releaseYear 
            ? "Không tìm thấy phim nào với bộ lọc này" 
            : "Không có phim nào"}
        </div>
      </section>
    )
  }

  return (
    <section className="py-8">
      {title && (
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl md:text-3xl font-bold mb-6"
        >
          {title}
        </motion.h2>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {movies.map((movie, index) => (
          <MovieCard key={movie.tmdb_id} movie={movie} index={index} />
        ))}
      </div>
      {enablePagination && totalPages && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            className="px-3 py-2 rounded border disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <button
            className="px-3 py-2 rounded border disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
