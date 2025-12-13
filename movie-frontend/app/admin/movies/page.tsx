"use client"

import { useEffect, useState } from "react"
import { adminAPI, countriesAPI } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { 
  Film, Search, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight,
  Save, X, Loader2
} from "lucide-react"

interface Movie {
  id: number
  tmdb_id: number
  title: string
  description: string
  poster: string
  banner: string
  release_year: number
  duration: number
  status: string
  trailer_url: string
  views: number
  created_at: string
  updated_at: string
  categories: Array<{ id: number; name: string }>
  country?: { id: number; name: string }
  actors: Array<{ id: number; name: string }>
}

interface PaginatedResponse {
  count: number
  next: string | null
  previous: string | null
  results: Movie[]
}

interface Category {
  id: number
  name: string
}

interface Country {
  id: number
  name: string
}

interface Actor {
  id: number
  name: string
}

export default function MovieManagementPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [actors, setActors] = useState<Actor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    tmdb_id: "",
    title: "",
    description: "",
    poster: "",
    banner: "",
    release_year: "",
    duration: "",
    status: "",
    trailer_url: "",
    categories: [] as number[],
    country: "",
    actors: [] as number[]
  })

  const pageSize = 20

  useEffect(() => {
    fetchMovies()
    fetchCategories()
    fetchCountries()
    fetchActors()
  }, [currentPage, searchTerm])

  const fetchMovies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', currentPage.toString())
      params.append('page_size', pageSize.toString())
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetchWithAuth(`/api/admin/movies/?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch movies')
      
      const data: PaginatedResponse = await response.json()
      setMovies(data.results)
      setTotalCount(data.count)
    } catch (error) {
      console.error('Error fetching movies:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetchWithAuth('/api/categories/')
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      setCategories(Array.isArray(data) ? data : (data.results || []))
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchCountries = async () => {
    try {
      const response = await countriesAPI.getCountries()
      setCountries(response)
    } catch (error) {
      console.error('Error fetching countries:', error)
      // Fallback to hardcoded list if API fails
      setCountries([
        { id: 1, name: 'United States of America' },
        { id: 2, name: 'India' },
        { id: 3, name: 'Mexico' },
        { id: 4, name: 'Japan' },
        { id: 5, name: 'South Korea' },
        { id: 90, name: 'Việt Nam' }
      ])
    }
  }

  const fetchActors = async () => {
    try {
      // For now, we'll create a simple list. In a real app, you'd have an actors endpoint
      setActors([
        { id: 1, name: 'Tom Cruise' },
        { id: 2, name: 'Robert Downey Jr.' },
        { id: 3, name: 'Scarlett Johansson' },
        { id: 4, name: 'Chris Evans' },
        { id: 5, name: 'Dwayne Johnson' }
      ])
    } catch (error) {
      console.error('Error fetching actors:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = selectedMovie 
        ? `/api/admin/movies/${selectedMovie.id}/`
        : '/api/admin/movies/'
      
      const method = selectedMovie ? 'PUT' : 'POST'
      
      const payload = {
        ...formData,
        release_year: formData.release_year ? parseInt(formData.release_year) : null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        tmdb_id: formData.tmdb_id ? parseInt(formData.tmdb_id) : null,
        country: formData.country ? parseInt(formData.country) : null,
        categories: formData.categories.filter(id => id != null && id !== undefined),
        actors: formData.actors.filter(id => id != null && id !== undefined)
      }

      console.log('Sending payload:', payload)
      console.log('URL:', url)
      console.log('Method:', method)

      const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Backend error:', errorData)
        throw new Error(errorData.detail || JSON.stringify(errorData) || 'Failed to save movie')
      }

      // Reset form and close modal
      setFormData({
        tmdb_id: "",
        title: "",
        description: "",
        poster: "",
        banner: "",
        release_year: "",
        duration: "",
        status: "",
        trailer_url: "",
        categories: [],
        country: "",
        actors: []
      })
      setIsCreateModalOpen(false)
      setIsEditModalOpen(false)
      setSelectedMovie(null)
      
      // Refresh movies list
      fetchMovies()
    } catch (error) {
      console.error('Error saving movie:', error)
      alert(error instanceof Error ? error.message : 'Failed to save movie')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (movie: Movie) => {
    setSelectedMovie(movie)
    setFormData({
      tmdb_id: movie.tmdb_id?.toString() || "",
      title: movie.title || "",
      description: movie.description || "",
      poster: movie.poster || "",
      banner: movie.banner || "",
      release_year: movie.release_year?.toString() || "",
      duration: movie.duration?.toString() || "",
      status: movie.status || "",
      trailer_url: movie.trailer_url || "",
      categories: movie.categories?.map(c => c.id) || [],
      country: movie.country?.id?.toString() || "",
      actors: movie.actors?.map(a => a.id) || []
    })
    setIsEditModalOpen(true)
  }

  const handleDelete = async (movie: Movie) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phim "${movie.title}"?`)) {
      return
    }

    try {
      const response = await fetchWithAuth(`/api/admin/movies/${movie.id}/`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete movie')
      }

      fetchMovies()
    } catch (error) {
      console.error('Error deleting movie:', error)
      alert('Failed to delete movie')
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
         <div className="mb-8 mt-20">
          <h1 className="text-3xl font-bold text-white mb-2">Quản lý phim</h1>
          <p className="text-gray-300">Quản lý danh sách phim, thêm, sửa, xóa thông tin</p>
        </div>

        {/* Search and Actions */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm theo tên, ID hoặc TMDB ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm phim
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Movies Table */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Danh sách phim ({totalCount} phim)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Đang tải...</span>
              </div>
            ) : (
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-4 text-gray-300 font-medium">ID</th>
                      <th className="text-left p-4 text-gray-300 font-medium">TMDB ID</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Poster</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Thông tin</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Năm</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Lượt xem</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Thể loại</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movies.map((movie) => (
                      <tr key={movie.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="p-4 text-gray-300">{movie.id}</td>
                        <td className="p-4 text-gray-300">{movie.tmdb_id}</td>
                        <td className="p-4">
                          {movie.poster && (
                            <img
                              src={movie.poster}
                              alt={movie.title}
                              className="w-12 h-16 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-movie.jpg"
                              }}
                            />
                          )}
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-white font-medium">{movie.title}</p>
                            <p className="text-gray-400 text-sm truncate max-w-xs">
                              {movie.description?.substring(0, 100)}...
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-gray-300">{movie.release_year}</td>
                        <td className="p-4 text-gray-300">{movie.views?.toLocaleString()}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {movie.categories?.slice(0, 2).map((category) => (
                              <Badge key={category.id} variant="secondary" className="text-xs">
                                {category.name}
                              </Badge>
                            ))}
                            {(movie.categories?.length || 0) > 2 && (
                              <Badge key="more" variant="secondary" className="text-xs">
                                +{(movie.categories?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(movie)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(movie)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                    <div className="text-gray-300 text-sm">
                      Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} của {totalCount}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="flex items-center px-3 text-gray-300">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                {selectedMovie ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setIsEditModalOpen(false)
                    setSelectedMovie(null)
                  }}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tmdb_id" className="text-gray-300">TMDB ID</Label>
                    <Input
                      id="tmdb_id"
                      value={formData.tmdb_id}
                      onChange={(e) => setFormData({...formData, tmdb_id: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="ID từ TMDB"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title" className="text-gray-300">Tên phim *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-gray-300">Mô tả</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="poster" className="text-gray-300">Poster URL</Label>
                    <Input
                      id="poster"
                      value={formData.poster}
                      onChange={(e) => setFormData({...formData, poster: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="banner" className="text-gray-300">Banner URL</Label>
                    <Input
                      id="banner"
                      value={formData.banner}
                      onChange={(e) => setFormData({...formData, banner: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="release_year" className="text-gray-300">Năm phát hành</Label>
                    <Input
                      id="release_year"
                      value={formData.release_year}
                      onChange={(e) => setFormData({...formData, release_year: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="2024"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration" className="text-gray-300">Thời lượng (phút)</Label>
                    <Input
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="120"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status" className="text-gray-300">Trạng thái</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Đang chiếu">Đang chiếu</SelectItem>
                        <SelectItem value="Sắp chiếu">Sắp chiếu</SelectItem>
                        <SelectItem value="Hoàn thành">Hoàn thành</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="trailer_url" className="text-gray-300">Trailer URL</Label>
                  <Input
                    id="trailer_url"
                    value={formData.trailer_url}
                    onChange={(e) => setFormData({...formData, trailer_url: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Thể loại</Label>
                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto bg-gray-700 border border-gray-600 rounded p-2">
                      {categories.map((category) => (
                        <label key={category.id} className="flex items-center space-x-2 text-gray-300">
                          <input
                            type="checkbox"
                            checked={formData.categories.includes(category.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({...formData, categories: [...formData.categories, category.id]})
                              } else {
                                setFormData({...formData, categories: formData.categories.filter(id => id !== category.id)})
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{category.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Quốc gia</Label>
                    <Select value={formData.country} onValueChange={(value) => setFormData({...formData, country: value})}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                        <SelectValue placeholder="Chọn quốc gia" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.id} value={country.id.toString()}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setIsEditModalOpen(false)
                      setSelectedMovie(null)
                    }}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {selectedMovie ? 'Cập nhật' : 'Thêm mới'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Footer />
    </div>
  )
}

// Helper function for authenticated requests
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  }

  // Convert relative URLs to absolute Django backend URLs
  const absoluteUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`

  return fetch(absoluteUrl, {
    ...options,
    headers,
  })
}
