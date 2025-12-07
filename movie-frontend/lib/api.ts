// API Service Layer - Kết nối với Django Backend
// Base URL của backend Django của bạn

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

// ============================================
// AUTH HELPERS - Quản lý JWT Token
// ============================================

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

// ============================================
// PROFILE API - Favorites, Comments, Change Password
// ============================================


export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("refresh_token")
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem("access_token", access)
  localStorage.setItem("refresh_token", refresh)
}

export function clearTokens(): void {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
}

// Headers với JWT token
function getAuthHeaders(): HeadersInit {
  const token = getAccessToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

// Headers với JWT nhưng KHÔNG set Content-Type (dùng cho FormData, upload file)
function getAuthHeadersNoContentType(): HeadersInit {
  const token = getAccessToken()
  const headers: HeadersInit = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

// Auto refresh token khi access token hết hạn
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // Nếu body là FormData, không set Content-Type để browser tự set boundary
  const isFormData = options.body instanceof FormData
  const headers = isFormData ? getAuthHeadersNoContentType() : getAuthHeaders()
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  // Nếu 401 Unauthorized, thử refresh token
  if (response.status === 401) {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/login/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      })

      if (refreshResponse.ok) {
        const data = await refreshResponse.json()
        localStorage.setItem("access_token", data.access)

        // Retry request với token mới
        const newHeaders = isFormData ? getAuthHeadersNoContentType() : getAuthHeaders()
        return fetch(url, {
          ...options,
          headers: {
            ...newHeaders,
            ...options.headers,
          },
        })
      } else {
        // Refresh token cũng hết hạn, clear tokens nhưng KHÔNG auto redirect
        clearTokens()
        // Throw error để component xử lý
        throw new Error("Session expired. Please login again.")
      }
    } else {
      // Không có refresh token, clear và throw error
      clearTokens()
      throw new Error("No refresh token. Please login again.")
    }
  }

  return response
}

// ============================================
// TYPE DEFINITIONS - Định nghĩa kiểu dữ liệu
// ============================================

export interface Category {
  id: number
  name: string
  movie_count?: number
}

export interface Movie {
  tmdb_id: number
  title: string
  poster: string
  release_year: number
  categories: Category[]
  description?: string
  country?: string
}

export interface MovieDetail extends Movie {
  description: string
  average_rating: number
  user_rating?: number | null
  is_favorite?: boolean
  trailer_url?: string | null
}

export interface Comment {
  id: number
  username: string
  content: string
  created_at: string
  movie_title?: string
  movie_tmdb_id?: number
  likes_count?: number
  dislikes_count?: number
  user_reaction?: 'like' | 'dislike' | null
  replies?: Comment[]
}

export interface UserRating {
  movie: Movie
  stars: number
  created_at: string
}

export interface AdminStats {
  user_count: number
  movie_count: number
  comment_count: number
  total_views: number
}

export interface UserProfile {
  username: string
  email: string
  nickname?: string | null
  date_of_birth?: string | null
  country?: string | null
  avatar?: string | null
  date_joined?: string
}

export interface TMDBSearchResult {
  tmdb_id: number
  title: string
  poster_path: string
  release_date: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

// ============================================
// AUTH API - Đăng nhập, đăng ký
// ============================================

export const authAPI = {
  // POST /api/auth/register/
  async register(username: string, email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    })
    if (!response.ok) throw new Error("Registration failed")
    return response.json()
  },

  // POST /api/auth/login/
  async login(username: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) throw new Error("Login failed")
    const data = await response.json()
    setTokens(data.access, data.refresh)
    return data
  },

  // Google OAuth Login
  async googleLogin(code: string): Promise<AuthTokens> {
    const response = await fetch(`${API_BASE_URL}/auth/google/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      console.error("Google OAuth backend error:", errorData)
      throw new Error(`Google login failed: ${errorData.error || errorData.detail || "Unknown error"}`)
    }
    const data = await response.json()
    setTokens(data.access, data.refresh)
    return data
  },

  // Get Google OAuth URL
  getGoogleAuthUrl(): string {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    console.log("Frontend Google Client ID:", clientId)
    const redirectUri = `${window.location.origin}/auth/google/callback`
    console.log("Frontend redirect URI:", redirectUri)
    const scope = 'email profile'
    const responseType = 'code'
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `response_type=${responseType}&` +
      `access_type=offline`
  },

  // Logout - Clear tokens
  logout() {
    clearTokens()
  },

  // POST /api/auth/login/refresh/
  async refreshToken(): Promise<{ access: string }> {
    const refresh = getRefreshToken()
    if (!refresh) throw new Error("No refresh token")

    const response = await fetch(`${API_BASE_URL}/auth/login/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
    if (!response.ok) throw new Error("Token refresh failed")
    return response.json()
  },
}

// ============================================
// MOVIES API - Lấy danh sách phim
// ============================================

export const moviesAPI = {
  // GET /api/movies/
  async getMovies(params?: {
    search?: string
    categories?: number | number[]
    release_year?: number
    page?: number
    page_size?: number
    country?: string
  }): Promise<any> {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append("search", params.search)
    if (params?.categories) {
      if (Array.isArray(params.categories)) {
        searchParams.append("categories", params.categories.join(','))
      } else {
        searchParams.append("categories", params.categories.toString())
      }
    }
    if (params?.release_year) searchParams.append("release_year", params.release_year.toString())
    if (params?.page) searchParams.append("page", params.page.toString())
    if (params?.page_size) searchParams.append("page_size", params.page_size.toString())
    if (params?.country) searchParams.append("country", params.country)

    const url = `${API_BASE_URL}/movies/?${searchParams.toString()}`
    const response = await fetchWithAuth(url)
    if (!response.ok) throw new Error("Failed to fetch movies")
    return response.json()
  },

  // GET /api/categories/
  async getCategories(): Promise<Category[]> {
    return categoriesAPI.getCategories()
  },

  // GET /api/movies/{tmdb_id}/
  async getMovie(tmdbId: number): Promise<MovieDetail> {
    // Use authenticated fetch to retrieve user-specific fields like user_rating
    const response = await fetchWithAuth(`${API_BASE_URL}/movies/${tmdbId}/`)
    if (!response.ok) throw new Error("Failed to fetch movie")
    return response.json()
  },

  // GET /api/movies/{tmdb_id}/comments/
  async getComments(tmdbId: number): Promise<Comment[]> {
    const response = await fetch(`${API_BASE_URL}/movies/${tmdbId}/comments/`)
    if (!response.ok) throw new Error("Failed to fetch comments")
    return response.json()
  },

  // POST /api/movies/{tmdb_id}/rate/
  async rateMovie(tmdbId: number, stars: number): Promise<{ status: string }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/movies/${tmdbId}/rate/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ score: stars }),
    })
    if (!response.ok) throw new Error("Failed to rate movie")
    return response.json()
  },

  // POST /api/movies/{tmdb_id}/favorite/
  async toggleFavorite(tmdbId: number): Promise<{ is_favorite: boolean; message: string }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/movies/${tmdbId}/favorite/`, {
      method: "POST",
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.error("toggleFavorite error:", { status: response.status, errorData })
      let errorMessage = "Failed to toggle favorite"
      if (errorData?.error) {
        errorMessage = errorData.error
      } else if (errorData?.detail) {
        errorMessage = errorData.detail
      }
      throw new Error(errorMessage)
    }
    return response.json()
  },

  // POST /api/movies/{tmdb_id}/increment_view/
  async incrementView(tmdbId: number): Promise<{ status: string; total_views: number }> {
    const response = await fetch(`${API_BASE_URL}/movies/${tmdbId}/increment_view/`, {
      method: "POST",
    })
    if (!response.ok) throw new Error("Failed to increment view")
    return response.json()
  },

  // GET /api/movies/{tmdb_id}/recommendations/
  async getRecommendations(tmdbId: number): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/movies/${tmdbId}/recommendations/`)
    if (!response.ok) throw new Error("Failed to fetch recommendations")
    return response.json()
  },

  async getTrending(window: 'day' | 'week' = 'day', limit = 10): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/movies/trending/?window=${window}&limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch trending movies')
    return response.json()
  },

  async getPopular(limit = 10): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/movies/popular/?limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch popular movies')
    return response.json()
  },

  async getNewReleases(limit = 10): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/movies/new_releases/?limit=${limit}`)
    if (!response.ok) throw new Error('Failed to fetch new releases')
    return response.json()
  },

  async getTopRated(limit = 10): Promise<Movie[]> {
    const response = await fetch(`${API_BASE_URL}/movies/top_rated/?limit=${limit}`, {
      cache: 'no-store'
    })
    if (!response.ok) throw new Error('Failed to fetch top rated movies')
    return response.json()
  },

  // POST /api/movies/{tmdb_id}/watch/
  async watch(tmdbId: number): Promise<{ status: string }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/movies/${tmdbId}/watch/`, {
      method: "POST",
    })
    if (!response.ok) throw new Error("Failed to record watch history")
    return response.json()
  },
}

// ============================================
// CATEGORIES API
// ============================================

export const categoriesAPI = {
  // GET /api/categories/
  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories/`)
    if (!response.ok) throw new Error("Failed to fetch categories")
    const data = await response.json()
    // Handle both paginated and non-paginated responses
    return Array.isArray(data) ? data : (data?.results || [])
  },

  // GET /api/categories/{pk}/
  async getCategory(id: number): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories/${id}/`)
    if (!response.ok) throw new Error("Failed to fetch category")
    return response.json()
  },
}

// ============================================
// COMMENTS API
// ============================================

export const commentsAPI = {
  // POST /api/comments/
  async createComment(movieTmdbId: number, content: string, parentId?: number): Promise<Comment> {
    const response = await fetchWithAuth(`${API_BASE_URL}/comments/`, {
      method: "POST",
      body: JSON.stringify({ movie_tmdb_id: movieTmdbId, content, parent_id: parentId }),
    })
    if (!response.ok) throw new Error("Failed to create comment")
    return response.json()
  },

  // PUT /api/comments/{pk}/
  async updateComment(commentId: number, content: string): Promise<Comment> {
    const response = await fetchWithAuth(`${API_BASE_URL}/comments/${commentId}/`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    })
    if (!response.ok) throw new Error("Failed to update comment")
    return response.json()
  },

  // DELETE /api/comments/{pk}/
  async deleteComment(commentId: number): Promise<void> {
    const response = await fetchWithAuth(`${API_BASE_URL}/comments/${commentId}/`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to delete comment")
  },

  // POST /api/comments/{id}/react/
  async react(commentId: number, reaction: 'like' | 'dislike'): Promise<Comment> {
    const response = await fetchWithAuth(`${API_BASE_URL}/comments/${commentId}/react/`, {
      method: "POST",
      body: JSON.stringify({ reaction }),
    })
    if (!response.ok) throw new Error("Failed to react to comment")
    return response.json()
  },

  // DELETE /api/comments/{id}/react/
  async removeReaction(commentId: number): Promise<Comment> {
    const response = await fetchWithAuth(`${API_BASE_URL}/comments/${commentId}/react/`, {
      method: "DELETE",
    })
    if (!response.ok) throw new Error("Failed to remove reaction")
    return response.json()
  },
}

// ============================================
// PROFILE API - Thông tin người dùng
// ============================================

export const profileAPI = {
  // GET /api/auth/profile/favorites/
  async getFavorites(): Promise<UserRating[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/favorites/`)
    if (!response.ok) throw new Error("Failed to fetch favorites")
    const data = await response.json()
    return Array.isArray(data) ? data : (data?.results ?? [])
  },

  // GET /api/auth/profile/comments/
  async getMyComments(): Promise<Comment[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/comments/`)
    if (!response.ok) throw new Error("Failed to fetch comments")
    const data = await response.json()
    return Array.isArray(data) ? data : (data?.results ?? [])
  },

  // PUT /api/auth/profile/change-password/
  async changePassword(
    oldPassword: string,
    newPassword: string,
    newPasswordConfirm: string,
  ): Promise<{ status: string }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/change-password/`, {
      method: "PUT",
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      // Try to extract server-side validation errors
      let message = "Failed to change password"
      if (data && typeof data === 'object') {
        const parts: string[] = []
        Object.entries(data).forEach(([key, val]) => {
          if (Array.isArray(val)) parts.push(`${key}: ${val.join(', ')}`)
          else if (typeof val === 'string') parts.push(`${key}: ${val}`)
        })
        if (parts.length) message = parts.join(' | ')
      }
      throw new Error(message)
    }
    return data
  },

  async getHistory(): Promise<{ movie: Movie; last_watched_at: string }[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/history/`)
    if (!response.ok) throw new Error("Failed to fetch history")
    const data = await response.json()
    return Array.isArray(data) ? data : (data?.results ?? [])
  },

  // GET /api/auth/profile/
  async getProfile(): Promise<UserProfile> {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/`)
    if (!response.ok) throw new Error("Failed to fetch profile")
    return response.json()
  },

  // PUT /api/auth/profile/
  async updateProfile(data: {
    username?: string
    nickname?: string | null
    date_of_birth?: string
    country?: string
    avatarFile?: File | null
  }): Promise<UserProfile> {
    const formData = new FormData()
    if (data.username) formData.append("username", data.username)
    if (data.nickname !== undefined) {
      if (data.nickname === null) {
        formData.append("nickname", "") // Gửi chuỗi rỗng để xóa nickname
      } else {
        formData.append("nickname", data.nickname)
      }
    }
    if (data.date_of_birth) formData.append("date_of_birth", data.date_of_birth)
    if (data.country) formData.append("country", data.country)
    if (data.avatarFile) formData.append("avatar", data.avatarFile)

    const response = await fetchWithAuth(`${API_BASE_URL}/auth/profile/`, {
      method: "PATCH",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      let errorMessage = "Failed to update profile"
      
      if (errorData && typeof errorData === 'object') {
        const parts: string[] = []
        Object.entries(errorData).forEach(([key, val]) => {
          if (Array.isArray(val)) parts.push(`${key}: ${val.join(', ')}`)
          else if (typeof val === 'string') parts.push(`${key}: ${val}`)
        })
        if (parts.length) errorMessage = parts.join(' | ')
      }
      
      throw new Error(errorMessage)
    }
    
    return response.json()
  },
}

// ============================================
// ADMIN API - Chỉ dành cho Admin
// ============================================

export const adminAPI = {
  // GET /api/admin/stats/
  async getStats(): Promise<AdminStats> {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/stats/`)
    if (!response.ok) throw new Error("Failed to fetch stats")
    return response.json()
  },

  // GET /api/admin/fetch-tmdb/?search={query}
  async searchTMDB(query: string): Promise<TMDBSearchResult[]> {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/fetch-tmdb/?search=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error("Failed to search TMDB")
    return response.json()
  },

  // POST /api/admin/import-tmdb/
  async importMovie(tmdbId: number): Promise<MovieDetail> {
    const response = await fetchWithAuth(`${API_BASE_URL}/admin/import-tmdb/`, {
      method: "POST",
      body: JSON.stringify({ tmdb_id: tmdbId }),
    })
    if (response.status === 409) throw new Error("Movie already exists")
    if (!response.ok) throw new Error("Failed to import movie")
    return response.json()
  },
}
