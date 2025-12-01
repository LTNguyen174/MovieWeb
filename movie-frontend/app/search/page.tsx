"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, X, Calendar, Globe, Film, Filter } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { MovieCard } from "@/components/movie-card"
import { Tag } from "@/components/tag"
import { moviesAPI, type Movie, type Category } from "@/lib/api"
import { useRouter, useSearchParams } from "next/navigation"

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [movies, setMovies] = useState<Movie[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [countries, setCountries] = useState<{id: number, name: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [hasSearched, setHasSearched] = useState(false)

  // Year options (last 20 years)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 20 }, (_, i) => currentYear - i)

  useEffect(() => {
    // Load categories and countries from database
    const loadData = async () => {
      try {
        // Load categories
        const categoriesData = await moviesAPI.getCategories()
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])

        // Load countries from debug endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/movies/debug/`)
        const debugData = await response.json()
        setCountries(debugData.countries || [])
        
        console.log('Loaded countries from database:', debugData.countries)
      } catch (err) {
        console.error("Failed to load data:", err)
        setCategories([])
        setCountries([])
      }
    }
    loadData()
  }, [])

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSearch = async () => {
    setLoading(true)
    setHasSearched(true)
    
    try {
      const params: any = {}
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }
      
      if (selectedCategories.length > 0) {
        params.categories = selectedCategories.join(',')
      }
      
      if (selectedYear) {
        params.release_year = parseInt(selectedYear)
      }
      
      if (selectedCountry) {
        // For country, we need to filter by country name
        // This will require custom filtering on the backend
        params.country = selectedCountry
      }
      
      console.log('Search params:', params)
      const response = await moviesAPI.getMovies(params)
      console.log('Search response:', response)
      setMovies(response.results || response || [])
    } catch (err) {
      console.error("Search failed:", err)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedYear('')
    setSelectedCountry('')
    setMovies([])
    setHasSearched(false)
    
    // Update URL to clean state
    router.push('/search')
  }

  const updateURL = () => {
    // Don't update URL automatically - only update when user searches
    return
  }

  useEffect(() => {
    // Remove URL update effect
    return
  }, [])

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-4">Tìm kiếm nâng cao</h1>
          <p className="text-muted-foreground">
            Tìm phim theo thể loại, năm sản xuất, quốc gia và nhiều hơn nữa
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 mb-8"
        >
          {/* Text Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên phim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Categories */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Film className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Thể loại</h3>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categories && categories.length > 0 ? (
                  categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="rounded border-border text-primary focus:ring-primary/50"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Không có thể loại nào
                  </div>
                )}
              </div>
            </div>

            {/* Year */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Năm sản xuất</h3>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Tất cả năm</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Quốc gia</h3>
              </div>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Tất cả quốc gia</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-full gap-2"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </Button>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="rounded-full gap-2"
            >
              <X className="w-4 h-4" />
              Xóa bộ lọc
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/movies/debug/`)
                  const data = await response.json()
                  console.log('Debug data:', data)
                  alert(`Debug info:\nTotal movies: ${data.total_movies}\nCountries: ${data.countries.length}\nCategories: ${data.categories.length}\nCheck console for details`)
                } catch (err) {
                  console.error('Debug failed:', err)
                  alert('Debug failed - check console')
                }
              }}
              className="rounded-full gap-2"
            >
              <Filter className="w-4 h-4" />
              Debug Data
            </Button>
          </div>
        </motion.div>

        {/* Results */}
        {hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Kết quả tìm kiếm ({movies.length} phim)
              </h2>
              {(searchQuery || selectedCategories.length > 0 || selectedYear || selectedCountry) && (
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                      "{searchQuery}"
                    </span>
                  )}
                  {selectedCategories.map((catId) => {
                    const cat = categories.find(c => c.id === catId)
                    return cat ? (
                      <Tag key={catId} text={cat.name} categoryId={catId} />
                    ) : null
                  })}
                  {selectedYear && (
                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                      {selectedYear}
                    </span>
                  )}
                  {selectedCountry && (
                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                      {selectedCountry}
                    </span>
                  )}
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-lg font-medium mb-2">Đang tìm kiếm...</div>
                <div className="text-muted-foreground">Vui lòng đợi trong giây lát</div>
              </div>
            ) : movies.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-lg font-medium mb-2">Không tìm thấy phim nào</div>
                <div className="text-muted-foreground">Thử thay đổi điều kiện tìm kiếm</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {movies.map((movie, index) => (
                  <MovieCard key={movie.tmdb_id} movie={movie} index={index} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  )
}
