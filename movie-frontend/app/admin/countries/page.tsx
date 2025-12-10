"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { 
  Search, Plus, Edit, Trash2, Save, X, Loader2, Globe
} from "lucide-react"

interface Country {
  id: number
  name: string
  movie_count: number
}

export default function CountryManagementPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1
  })

  const [formData, setFormData] = useState({
    name: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCountries = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString() })
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetchWithAuth(`/api/admin/countries/?${params}`)
      if (!response.ok) throw new Error('Failed to fetch countries')
      
      const data = await response.json()
      setCountries(data.results || [])
      setPagination({
        count: data.count || 0,
        next: data.next,
        previous: data.previous,
        currentPage: page
      })
    } catch (error) {
      console.error('Error fetching countries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCountries(1)
  }, [searchTerm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = selectedCountry 
        ? `/api/admin/countries/${selectedCountry.id}/`
        : '/api/admin/countries/'
      
      const method = selectedCountry ? 'PUT' : 'POST'

      const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || JSON.stringify(errorData) || 'Failed to save country')
      }

      setFormData({ name: "" })
      setIsCreateModalOpen(false)
      setIsEditModalOpen(false)
      setSelectedCountry(null)
      
      fetchCountries(pagination.currentPage)
    } catch (error) {
      console.error('Error saving country:', error)
      alert(error instanceof Error ? error.message : 'Failed to save country')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (country: Country) => {
    setSelectedCountry(country)
    setFormData({ name: country.name })
    setIsEditModalOpen(true)
  }

  const handleDelete = async (country: Country) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa quốc gia "${country.name}"?`)) {
      return
    }

    try {
      const response = await fetchWithAuth(`/api/admin/countries/${country.id}/`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete country')
      }

      fetchCountries(pagination.currentPage)
    } catch (error) {
      console.error('Error deleting country:', error)
      alert('Failed to delete country')
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 mt-20">
          <h1 className="text-3xl font-bold text-white mb-2">Quản lý quốc gia</h1>
          <p className="text-gray-300">Quản lý danh sách quốc gia sản xuất phim</p>
        </div>

        {/* Search and Actions */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm quốc gia..."
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
                Thêm quốc gia
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Countries Table */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Danh sách quốc gia ({pagination.count} quốc gia)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Đang tải...</span>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                {countries.map((country) => (
                  <div key={country.id} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:bg-gray-700/50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Globe className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{country.name}</h3>
                        <p className="text-gray-400 text-sm">{country.movie_count} phim</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(country)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(country)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {pagination.count > 30 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Hiển thị {countries.length} / {pagination.count} quốc gia
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchCountries(pagination.currentPage - 1)}
                      disabled={!pagination.previous}
                      className="h-8"
                    >
                      Trước
                    </Button>
                    <span className="flex items-center px-3 text-sm text-gray-300">
                      Trang {pagination.currentPage}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchCountries(pagination.currentPage + 1)}
                      disabled={!pagination.next}
                      className="h-8"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-white">
                {selectedCountry ? 'Chỉnh sửa quốc gia' : 'Thêm quốc gia mới'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-gray-300">Tên quốc gia</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Lưu
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setIsEditModalOpen(false)
                      setSelectedCountry(null)
                      setFormData({ name: "" })
                    }}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Hủy
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

// Helper function for authenticated fetch
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(`http://localhost:8000${url}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  return response
}
