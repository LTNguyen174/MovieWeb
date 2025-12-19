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
  categoryIds?: number[]
  releaseYear?: number | null
  country?: string | null
  pageSize?: number
  enablePagination?: boolean
}

export function MovieGrid({ movies: propMovies, title, searchQuery, categoryId, categoryIds, releaseYear, country, pageSize = 30, enablePagination = false }: MovieGridProps) {
  const [movies, setMovies] = useState<Movie[]>(propMovies || [])
  const [loading, setLoading] = useState(!propMovies)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const totalPages = totalCount ? Math.max(1, Math.ceil(totalCount / pageSize)) : null
  const [gotoValue, setGotoValue] = useState<string>("")
  const [gotoError, setGotoError] = useState<string | null>(null)

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, categoryId, categoryIds, releaseYear, country])

  useEffect(() => {
    // Nếu có movies từ props VÀ không có search/filter, dùng propMovies
    // Nếu có search/filter, luôn fetch từ API
    const hasFilters = searchQuery || categoryId || categoryIds || releaseYear || country
    
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
          categories: categoryIds || categoryId || undefined,
          release_year: releaseYear || undefined,
          country: country || undefined,
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
  }, [propMovies, searchQuery, categoryId, categoryIds, releaseYear, country, page, pageSize, enablePagination])

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
      {(title || (enablePagination && totalCount)) && (
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
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            className="px-3 py-2 rounded border border-red-500 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-sm font-medium text-red-500">
            Page {page} / {totalPages}
          </span>
          <button
            className="px-3 py-2 rounded border border-red-500 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
          >
            Next
          </button>
          <div className="flex items-center gap-2 ml-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={gotoValue}
              onChange={(e) => {
                const v = e.target.value
                setGotoValue(v)
                if (!v) { setGotoError(null); return }
                const n = Number(v)
                if (!Number.isInteger(n)) { setGotoError("Vui lòng nhập số nguyên"); return }
                if (totalPages && (n < 1 || n > totalPages)) { setGotoError(`Chỉ từ 1 đến ${totalPages}`); return }
                setGotoError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = parseInt(gotoValue, 10)
                  if (!Number.isNaN(n) && (!totalPages || (n >= 1 && n <= totalPages))) {
                    const clamped = totalPages ? Math.max(1, Math.min(totalPages, n)) : n
                    setPage(clamped)
                    setGotoValue("")
                    setGotoError(null)
                  }
                }
              }}
              placeholder="Go to page"
              aria-invalid={!!gotoError}
              className={`h-9 w-28 rounded bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                gotoError ? "border border-red-500 focus:ring-red-500" : "border border-red-500 focus:ring-red-500"
              }`}
            />
            <button
              className="px-3 py-2 rounded border border-red-500 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
              disabled={!gotoValue || !!gotoError}
              onClick={() => {
                const n = parseInt(gotoValue, 10)
                if (!Number.isNaN(n) && (!totalPages || (n >= 1 && n <= totalPages))) {
                  const clamped = totalPages ? Math.max(1, Math.min(totalPages, n)) : n
                  setPage(clamped)
                  setGotoValue("")
                  setGotoError(null)
                }
              }}
            >
              Go
            </button>
            {gotoError && <span className="text-xs text-red-500 ml-1">{gotoError}</span>}
          </div>
        </div>
      )}
    </section>
  )
}
