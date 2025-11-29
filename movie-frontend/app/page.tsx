"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroBanner } from "@/components/hero-banner"
import { SearchBar } from "@/components/search-bar"
import { CategorySelect, YearSelect } from "@/components/category-select"
import { MovieGrid } from "@/components/movie-grid"
import { RecommendationCarousel } from "@/components/recommendation-carousel"
import { moviesAPI, type Movie } from "@/lib/api"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [trendingDay, setTrendingDay] = useState<Movie[]>([])
  const [trendingWeek, setTrendingWeek] = useState<Movie[]>([])
  const [newReleases, setNewReleases] = useState<Movie[]>([])
  const [topRated, setTopRated] = useState<Movie[]>([])
  const [year2025, setYear2025] = useState<Movie[]>([])

  useEffect(() => {
    let cancelled = false
    
    // Cache keys
    const CACHE_KEYS = {
      trendingDay: 'trending_day_cache',
      trendingWeek: 'trending_week_cache', 
      newReleases: 'new_releases_cache',
      topRated: 'top_rated_cache'
    }
    
    // Try to load from cache first
    function loadFromCache() {
      try {
        const cached = {
          trendingDay: JSON.parse(localStorage.getItem(CACHE_KEYS.trendingDay) || '[]'),
          trendingWeek: JSON.parse(localStorage.getItem(CACHE_KEYS.trendingWeek) || '[]'),
          newReleases: JSON.parse(localStorage.getItem(CACHE_KEYS.newReleases) || '[]'),
          topRated: JSON.parse(localStorage.getItem(CACHE_KEYS.topRated) || '[]')
        }
        
        if (cached.trendingDay.length > 0) setTrendingDay(cached.trendingDay)
        if (cached.trendingWeek.length > 0) setTrendingWeek(cached.trendingWeek)
        if (cached.newReleases.length > 0) setNewReleases(cached.newReleases)
        if (cached.topRated.length > 0) setTopRated(cached.topRated)
        
        return cached
      } catch {
        return null
      }
    }
    
    async function load() {
      // Load from cache first
      const cached = loadFromCache()
      
      try {
        // Load tuần tự để hiển thị nhanh hơn
        const td = await moviesAPI.getTrending("day", 10)
        if (!cancelled) {
          setTrendingDay(td)
          localStorage.setItem(CACHE_KEYS.trendingDay, JSON.stringify(td))
        }

        const tw = await moviesAPI.getTrending("week", 10)
        if (!cancelled) {
          setTrendingWeek(tw)
          localStorage.setItem(CACHE_KEYS.trendingWeek, JSON.stringify(tw))
        }

        const nr = await moviesAPI.getNewReleases(10)
        if (!cancelled) {
          setNewReleases(nr)
          localStorage.setItem(CACHE_KEYS.newReleases, JSON.stringify(nr))
        }

        const tr = await moviesAPI.getTopRated(10)
        if (!cancelled) {
          setTopRated(tr)
          localStorage.setItem(CACHE_KEYS.topRated, JSON.stringify(tr))
        }

        if (!cancelled) setYear2025([])
      } catch (err) {
        console.warn('Failed to load movies, using cache:', err)
        // Nếu API lỗi, dùng cache đã có
        if (cached && !cancelled) {
          setTrendingDay(cached.trendingDay)
          setTrendingWeek(cached.trendingWeek)
          setNewReleases(cached.newReleases)
          setTopRated(cached.topRated)
          setYear2025([])
        }
      }
    }
    
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <HeroBanner />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        {/* Search & Filters */}
        <section className="py-8">
          <SearchBar onSearch={setSearchQuery} placeholder="Search for movies, genres, actors..." />

          <div className="flex flex-wrap items-center gap-4 mt-6 justify-center">
            <CategorySelect selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
            <YearSelect selectedYear={selectedYear} onSelect={setSelectedYear} />
          </div>
        </section>

        {/* Featured Carousels - Chỉ hiển thị khi không search/filter */}
        {!searchQuery && !selectedCategory && !selectedYear && (
          <>
            <RecommendationCarousel title="Trending Today" movies={trendingDay} />
            <RecommendationCarousel title="Trending This Week" movies={trendingWeek} />
          </>
        )}

        {/* Movie Grid - Chỉ hiển thị khi có search hoặc filter */}
        {(searchQuery || selectedCategory || selectedYear) && (
          <MovieGrid 
            title={
              searchQuery 
                ? `Kết quả tìm kiếm: "${searchQuery}"` 
                : selectedCategory || selectedYear 
                  ? "Phim được lọc" 
                  : undefined
            }
            searchQuery={searchQuery || undefined}
            categoryId={selectedCategory}
            releaseYear={selectedYear}
          />
        )}

        {/* More Carousels - Chỉ hiển thị khi không search/filter */}
        {!searchQuery && !selectedCategory && !selectedYear && (
          <>
            <RecommendationCarousel title="New Releases" movies={newReleases} />
            <RecommendationCarousel title="Top Rated" movies={topRated} />
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
