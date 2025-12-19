"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, X, Calendar, Globe, Film, Filter } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { MovieCard } from "@/components/movie-card"
import { MovieGrid } from "@/components/movie-grid"
import { Tag } from "@/components/tag"
import { moviesAPI, categoriesAPI, countriesAPI, yearsAPI } from '@/lib/api'
import { useRouter, useSearchParams } from "next/navigation"
import type { Movie, Category } from '@/lib/api'

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [movies, setMovies] = useState<Movie[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [countries, setCountries] = useState<{id: number, name: string}[]>([])
  const [years, setYears] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [hasSearched, setHasSearched] = useState(false)
  const [extractedKeywords, setExtractedKeywords] = useState<any>(null)
  const [isExtracting, setIsExtracting] = useState(false)

  useEffect(() => {
    // Load categories and countries from database
    const loadData = async () => {
      try {
        // Load categories
        const categoriesData = await moviesAPI.getCategories()
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])

        // Load countries from database
        try {
          console.log('DEBUG: Loading countries from API...')
          const countriesData = await countriesAPI.getCountries()
          console.log('DEBUG: Countries loaded:', countriesData.length, 'countries')
          console.log('DEBUG: First 10 countries:', countriesData.slice(0, 10))
          console.log('DEBUG: Last 10 countries:', countriesData.slice(-10))
          setCountries(Array.isArray(countriesData) ? countriesData : [])
        } catch (err) {
          console.error("Failed to load countries:", err)
          console.log('DEBUG: Setting empty countries array - API failed')
          // Don't use fallback - let user know API failed
          setCountries([])
        }

        // Load years from database
        try {
          console.log('DEBUG: Loading years from API...')
          const yearsData = await yearsAPI.getYears()
          console.log('DEBUG: Years loaded:', yearsData.length, 'years')
          setYears(Array.isArray(yearsData) ? yearsData : [])
        } catch (err) {
          console.error("Failed to load years:", err)
          console.log('DEBUG: Setting empty years array - API failed')
          setYears([])
        }
      } catch (err) {
        console.error("Failed to load data:", err)
        setCategories([])
        setCountries([])
      }
    }
    loadData()
  }, [])

  // Handle suggested movies from AI chatbot
  useEffect(() => {
    const suggested = searchParams.get("suggested")
    if (suggested) {
      setHasSearched(true)
      setLoading(true)
      ;(async () => {
        try {
          const response = await moviesAPI.getMovies({ tmdb_ids: suggested })
          const list = Array.isArray(response) ? response : response.results || []
          setMovies(list)
        } catch (err) {
          console.error("Failed to load suggested movies:", err)
          setMovies([])
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [searchParams])

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCheckboxSearch = async () => {
    setLoading(true)
    setHasSearched(true)
    setExtractedKeywords(null) // Đảm bảo reset extractedKeywords khi tìm kiếm bằng checkbox
    
    try {
      const params: any = {}
      
      // Only use manually selected filters - ignore searchQuery
      if (selectedCategories.length > 0) {
        params.categories = selectedCategories.join(',')
      }
      
      if (selectedYear) {
        params.release_year = selectedYear
      }
      
      if (selectedCountry) {
        params.country = selectedCountry
      }
      
      console.log('Checkbox search params:', params)
      const response = await moviesAPI.getMovies(params)
      console.log('Checkbox search response:', response)
      setMovies(response.results || response || [])
    } catch (err) {
      console.error("Checkbox search failed:", err)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeywordSearch = async () => {
    setLoading(true)
    setHasSearched(true)
    
    // Reset all filters for keyword search
    setSelectedCategories([])
    setSelectedYear('')
    setSelectedCountry('')
    setExtractedKeywords(null)
    
    try {
      const params: any = {}
      
      if (searchQuery.trim()) {
        // Extract keywords first
        const keywords = await extractKeywords(searchQuery.trim())
        console.log('Extracted keywords for keyword search:', keywords)
        
        // Use extracted keywords based on query type
        if (keywords.query_type === 'structured') {
          // Structured query: only use filters, no title search
          if (keywords.genres.length > 0) {
            params.categories = keywords.genres.join(',')
            
            // Auto-select genre checkboxes
            const categoryIds = keywords.genres.map(genre => {
              const category = categories.find(cat => cat.name === genre)
              return category ? category.id : null
            }).filter(id => id !== null)
            
            if (categoryIds.length > 0) {
              setSelectedCategories(categoryIds)
            }
          }
          
          if (keywords.country) {
            // Auto-select country dropdown with mapping
            const countryMapping: { [key: string]: string } = {
              'united states of america': 'United States of America',
              'united kingdom': 'United Kingdom',
              'vietnam': 'Vietnam',
              'japan': 'Japan',
              'south korea': 'South Korea',
              'china': 'China',
              'finland': 'Finland',
              'france': 'France',
              'germany': 'Germany',
              'italy': 'Italy',
              'spain': 'Spain',
              'canada': 'Canada',
              'australia': 'Australia',
              'brazil': 'Brazil',
              'mexico': 'Mexico',
              'russia': 'Russia',
              'india': 'India'
            }
            
            const mappedCountryName = countryMapping[keywords.country.toLowerCase()] || keywords.country
            const country = countries.find(c => c.name === mappedCountryName)
            
            if (country) {
              console.log('DEBUG: Setting selectedCountry to:', country.name)
              setSelectedCountry(country.name)
              params.country = country.name
              
              await new Promise(resolve => setTimeout(resolve, 10))
            } else {
              if (countries.length === 0) {
                console.log('DEBUG: Countries not loaded, setting selectedCountry to:', mappedCountryName)
                setSelectedCountry(mappedCountryName)
                params.country = mappedCountryName
                await new Promise(resolve => setTimeout(resolve, 10))
              } else {
                console.log('DEBUG: Country not found, using fallback:', keywords.country)
                params.country = keywords.country
              }
            }
          }
          
          if (keywords.year) {
            params.release_year = keywords.year
            setSelectedYear(keywords.year.toString())
          }
          
          // Display extracted keywords for structured query
          if (keywords.genres.length > 0 || keywords.country || keywords.year) {
            setExtractedKeywords({
              keywords,
              formatted_info: `${keywords.genres.length > 0 ? `Thể loại: ${keywords.genres.join(', ')}` : ''}${keywords.country ? ` | Quốc gia: ${keywords.country}` : ''}${keywords.year ? ` | Năm: ${keywords.year}` : ''}`.trim()
            })
          } else {
            setExtractedKeywords(null)
          }
          
        } else if (keywords.query_type === 'title_search') {
          // Title search: only search by movie title
          if (keywords.movie_title) {
            params.search = keywords.movie_title
          }
          
          // Display title search info
          setExtractedKeywords({
            keywords,
            formatted_info: `Tìm kiếm theo tên: "${keywords.movie_title}"`
          })
          
        } else {
          // Natural query: use both title search and filters
          if (keywords.movie_title) {
            params.search = keywords.movie_title
          }
          
          if (keywords.genres.length > 0) {
            params.categories = keywords.genres.join(',')
            
            // Auto-select genre checkboxes
            const categoryIds = keywords.genres.map(genre => {
              const category = categories.find(cat => cat.name === genre)
              return category ? category.id : null
            }).filter(id => id !== null)
            
            if (categoryIds.length > 0) {
              setSelectedCategories(categoryIds)
            }
          }
          
          if (keywords.country) {
            // Auto-select country dropdown with mapping
            const countryMapping: { [key: string]: string } = {
              'united states of america': 'United States of America',
              'united kingdom': 'United Kingdom',
              'vietnam': 'Vietnam',
              'japan': 'Japan',
              'south korea': 'South Korea',
              'china': 'China',
              'finland': 'Finland',
              'france': 'France',
              'germany': 'Germany',
              'italy': 'Italy',
              'spain': 'Spain',
              'canada': 'Canada',
              'australia': 'Australia',
              'brazil': 'Brazil',
              'mexico': 'Mexico',
              'russia': 'Russia',
              'india': 'India'
            }
            
            const mappedCountryName = countryMapping[keywords.country.toLowerCase()] || keywords.country
            const country = countries.find(c => c.name === mappedCountryName)
            
            if (country) {
              console.log('DEBUG: Setting selectedCountry to:', country.name)
              setSelectedCountry(country.name)
              params.country = country.name
              
              await new Promise(resolve => setTimeout(resolve, 10))
            } else {
              if (countries.length === 0) {
                console.log('DEBUG: Countries not loaded, setting selectedCountry to:', mappedCountryName)
                setSelectedCountry(mappedCountryName)
                params.country = mappedCountryName
                await new Promise(resolve => setTimeout(resolve, 10))
              } else {
                console.log('DEBUG: Country not found, using fallback:', keywords.country)
                params.country = keywords.country
              }
            }
          }
          
          if (keywords.year) {
            params.release_year = keywords.year
            setSelectedYear(keywords.year.toString())
          }
          
          // Display extracted keywords for natural query
          if (keywords.movie_title || keywords.genres.length > 0 || keywords.country || keywords.year) {
            setExtractedKeywords({
              keywords,
              formatted_info: `${keywords.movie_title ? `Tên phim: ${keywords.movie_title}` : ''}${keywords.genres.length > 0 ? ` | Thể loại: ${keywords.genres.join(', ')}` : ''}${keywords.country ? ` | Quốc gia: ${keywords.country}` : ''}${keywords.year ? ` | Năm: ${keywords.year}` : ''}`.trim()
            })
          } else {
            setExtractedKeywords(null)
          }
        }
      }
      
      console.log('Keyword search params:', params)
      const response = await moviesAPI.getMovies(params)
      console.log('Keyword search response:', response)
      setMovies(response.results || response || [])
    } catch (err) {
      console.error("Keyword search failed:", err)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    // Decide which search to use based on whether user has typed a query
    if (searchQuery.trim()) {
      // User typed something - use keyword search
      await handleKeywordSearch()
    } else {
      // No query typed - use checkbox search
      await handleCheckboxSearch()
    }
  }

  const extractKeywords = async (query: string) => {
    try {
      const result = await moviesAPI.extractKeywords(query)
      return result.keywords as {
        query_type: 'structured' | 'title_search' | 'natural',
        genres: string[]
        country: string
        year: number | null
        movie_title: string
        keywords: string[]
        original_query: string
      }
    } catch (err) {
      console.error("Keyword extraction failed:", err)
      return { 
        query_type: 'natural' as const,
        genres: [], 
        country: '', 
        year: null, 
        movie_title: '', 
        keywords: [], 
        original_query: query 
      }
    }
  }

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value
    setSearchQuery(newQuery)
    
    // Clear extracted keywords when user changes the query
    // Only show results when they click search
    setExtractedKeywords(null)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedYear('')
    setSelectedCountry('')
    setMovies([])
    setHasSearched(false)
    setExtractedKeywords(null)
    
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

  // Debug: Log when selectedCountry changes
  useEffect(() => {
    console.log('DEBUG: selectedCountry changed to:', selectedCountry)
  }, [selectedCountry])

  // Debug: Log when countries array changes
  useEffect(() => {
    console.log('DEBUG: countries array updated:', countries.length, 'countries')
    if (countries.length > 0) {
      console.log('DEBUG: First country:', countries[0])
      console.log('DEBUG: Last country:', countries[countries.length - 1])
    }
  }, [countries])

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
                onChange={handleQueryChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            
            {/* Extracted Keywords Display */}
            {isExtracting && (
              <div className="mt-3 text-sm text-muted-foreground">
                Đang phân tích từ khóa...
              </div>
            )}
            
            {extractedKeywords && (
              <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="text-sm font-medium text-primary mb-2">
                  Từ khóa đã nhận diện:
                </div>
                <div className="text-sm text-foreground">
                  {extractedKeywords.formatted_info}
                </div>
              </div>
            )}
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
              </h2>
              {(searchQuery || selectedCategories.length > 0 || selectedYear || selectedCountry) && (
                <div className="flex flex-wrap gap-2">
                  {searchQuery && extractedKeywords && (extractedKeywords.keywords.movie_title || extractedKeywords.keywords.genres.length > 0 || extractedKeywords.keywords.country || extractedKeywords.keywords.year) ? (
                    // Show extracted keywords only if meaningful keywords were found AND there's a search query
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      ✓ Đã tự động lọc theo từ khóa
                    </span>
                  ) : searchQuery && (
                    // Fallback to original query if no keywords extracted
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
              <MovieGrid 
                title={extractedKeywords && (extractedKeywords.keywords.movie_title || extractedKeywords.keywords.genres.length > 0 || extractedKeywords.keywords.country || extractedKeywords.keywords.year) ? 
                  (extractedKeywords.keywords.movie_title ? 
                    `Kết quả tìm kiếm: "${extractedKeywords.keywords.movie_title}"` :
                    `Kết quả tìm kiếm (đã lọc tự động)`
                  ) :
                  searchQuery ? `Kết quả tìm kiếm: "${searchQuery}"` : 
                  undefined
                }
                searchQuery={extractedKeywords && extractedKeywords.keywords.movie_title ? 
                  extractedKeywords.keywords.movie_title : 
                  (searchQuery && !extractedKeywords) ? searchQuery :
                  undefined
                }
                categoryIds={selectedCategories.length > 0 ? selectedCategories : undefined}
                releaseYear={selectedYear ? parseInt(selectedYear) : undefined}
                country={selectedCountry || undefined}
                enablePagination={true}
                pageSize={30}
              />
            )}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  )
}
