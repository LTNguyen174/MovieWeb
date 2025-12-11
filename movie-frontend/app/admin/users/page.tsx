"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Search, Plus, Edit, Trash2, Loader2, Users, Shield, User, 
  Ban, Key, History, Eye, EyeOff, CheckCircle, Save
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { AdminSidebar } from "@/components/admin-sidebar"
import { useAuth } from "@/hooks/use-auth"

interface AdminUser {
  id: number
  username: string
  email: string
  nickname: string
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
  date_joined: string
  last_login: string
  country?: string
  date_of_birth?: string
  avatar?: string
}

interface WatchHistoryItem {
  movie_title: string
  movie_poster: string
  watched_at: string
  progress: number
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isWatchHistoryModalOpen, setIsWatchHistoryModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1
  })

  const [formData, setFormData] = useState({
    is_staff: false,
    is_superuser: false,
    is_active: true
  })

  const [createFormData, setCreateFormData] = useState({
    username: "",
    email: "",
    password: "",
    is_staff: false,
    is_superuser: false
  })

  const [createFormErrors, setCreateFormErrors] = useState({
    username: "",
    email: "",
    password: ""
  })

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString() })
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetchWithAuth(`/api/admin/users/?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.results || [])
      setPagination({
        count: data.count || 0,
        next: data.next,
        previous: data.previous,
        currentPage: page
      })
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(1)
  }, [searchTerm])

  const handleBan = async (user: AdminUser) => {
    if (!confirm(`Bạn có chắc chắn muốn ban user "${user.username}"?`)) {
      return
    }

    try {
      const response = await fetchWithAuth(`/api/admin/users/${user.id}/ban/`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to ban user')
      }

      fetchUsers(pagination.currentPage)
    } catch (error) {
      console.error('Error banning user:', error)
      alert('Failed to ban user')
    }
  }

  const handleUnban = async (user: AdminUser) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${user.id}/unban/`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to unban user')
      }

      fetchUsers(pagination.currentPage)
    } catch (error) {
      console.error('Error unbanning user:', error)
      alert('Failed to unban user')
    }
  }

  const handleResetPassword = async (user: AdminUser) => {
    if (!confirm(`Bạn có chắc chắn muốn reset password của user "${user.username}" về "123456"?`)) {
      return
    }

    try {
      const response = await fetchWithAuth(`/api/admin/users/${user.id}/reset_password/`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to reset password')
      }

      const data = await response.json()
      alert(`Password đã được reset về: ${data.new_password}`)
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Failed to reset password')
    }
  }

  const handleViewWatchHistory = async (user: AdminUser) => {
    try {
      const response = await fetchWithAuth(`/api/admin/users/${user.id}/watch_history/`)
      if (!response.ok) throw new Error('Failed to fetch watch history')
      
      const data = await response.json()
      setWatchHistory(data)
      setSelectedUser(user)
      setIsWatchHistoryModalOpen(true)
    } catch (error) {
      console.error('Error fetching watch history:', error)
      alert('Failed to fetch watch history')
    }
  }

  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user)
    setFormData({
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
      is_active: user.is_active
    })
    setIsEditModalOpen(true)
  }

  const validateCreateForm = () => {
    const errors = {
      username: "",
      email: "",
      password: ""
    }

    // Username validation - only letters, numbers, and @/./+/-/_
    const usernameRegex = /^[a-zA-Z0-9@.+\-_]+$/
    if (!createFormData.username.trim()) {
      errors.username = "Username is required"
    } else if (!usernameRegex.test(createFormData.username)) {
      errors.username = "Username may only contain letters, numbers, and @/./+/-/_ characters"
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!createFormData.email.trim()) {
      errors.email = "Email is required"
    } else if (!emailRegex.test(createFormData.email)) {
      errors.email = "Invalid email format"
    }

    // Password validation
    if (!createFormData.password.trim()) {
      errors.password = "Password is required"
    } else if (createFormData.password.length < 6) {
      errors.password = "Password must be at least 6 characters"
    }

    setCreateFormErrors(errors)
    return !errors.username && !errors.email && !errors.password
  }

  const handleCreate = () => {
    setCreateFormData({
      username: "",
      email: "",
      password: "",
      is_staff: false,
      is_superuser: false
    })
    setCreateFormErrors({ username: "", email: "", password: "" })
    setIsCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateCreateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetchWithAuth('/api/admin/users/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFormData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Backend error:', errorData)
        // Map backend errors to form fields
        const errors = { username: "", email: "", password: "" }
        if (errorData.username) errors.username = errorData.username[0]
        if (errorData.email) errors.email = errorData.email[0]
        if (errorData.password) errors.password = errorData.password[0]
        setCreateFormErrors(errors)
        throw new Error(`Failed to create user: ${JSON.stringify(errorData)}`)
      }

      setIsCreateModalOpen(false)
      fetchUsers(pagination.currentPage)
    } catch (error) {
      console.error('Error creating user:', error)
      // Don't show alert here since errors are displayed in form
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsSubmitting(true)

    try {
      const response = await fetchWithAuth(`/api/admin/users/${selectedUser.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to update user')
      }

      setIsEditModalOpen(false)
      setSelectedUser(null)
      fetchUsers(pagination.currentPage)
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Failed to update user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleBadge = (user: AdminUser) => {
    if (user.is_superuser) return <Badge className="bg-purple-600">Admin</Badge>
    if (user.is_staff) return <Badge className="bg-red-600">Staff</Badge>
    return <Badge variant="secondary">User</Badge>
  }

  const getStatusBadge = (user: AdminUser) => {
    return user.is_active 
      ? <Badge className="bg-green-600">Active</Badge>
      : <Badge className="bg-orange-600">Banned</Badge>
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 mt-20">
          <h1 className="text-3xl font-bold text-white mb-2">
            {currentUser?.isSuperUser ? 'Quản lý Users' : 'Danh sách Users'}
          </h1>
          <p className="text-gray-300">
            {currentUser?.isSuperUser ? 'Quản lý danh sách người dùng' : 'Xem danh sách người dùng thường'}
          </p>
        </div>

        {/* Search and Actions */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Danh sách Users ({pagination.count} users)
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
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:bg-gray-700/50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-medium">{user.username}</h3>
                            {getRoleBadge(user)}
                            {getStatusBadge(user)}
                          </div>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            Joined: {new Date(user.date_joined).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewWatchHistory(user)}
                          className="h-8 w-8 p-0"
                          title="Xem lịch sử"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(user)}
                          className="h-8 w-8 p-0"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {user.is_active ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBan(user)}
                            className="h-8 w-8 p-0"
                            title="Ban user"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnban(user)}
                            className="h-8 w-8 p-0"
                            title="Unban user"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(user)}
                          className="h-8 w-8 p-0"
                          title="Reset password"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {pagination.count > 30 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                      Hiển thị {users.length} / {pagination.count} users
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUsers(pagination.currentPage - 1)}
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
                        onClick={() => fetchUsers(pagination.currentPage + 1)}
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

      {/* Edit User Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-white">
                {isCreateModalOpen ? 'Tạo User mới' : 'Chỉnh sửa User: ' + selectedUser?.username}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={isCreateModalOpen ? handleCreateSubmit : handleSubmit} className="space-y-4">
                {isCreateModalOpen && (
                  <>
                    <div>
                      <Label className="text-gray-300">Username</Label>
                      <Input
                        type="text"
                        value={createFormData.username}
                        onChange={(e) => setCreateFormData({...createFormData, username: e.target.value})}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                      {createFormErrors.username && (
                        <p className="text-red-500 text-sm mt-1">{createFormErrors.username}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-300">Email</Label>
                      <Input
                        type="email"
                        value={createFormData.email}
                        onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                      {createFormErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{createFormErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-gray-300">Password</Label>
                      <Input
                        type="password"
                        value={createFormData.password}
                        onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                        minLength={6}
                      />
                      {createFormErrors.password && (
                        <p className="text-red-500 text-sm mt-1">{createFormErrors.password}</p>
                      )}
                    </div>
                  </>
                )}
                
                <div>
                  <Label className="text-gray-300">Role</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="role_user"
                        name="role"
                        checked={!isCreateModalOpen ? !formData.is_staff && !formData.is_superuser : !createFormData.is_staff && !createFormData.is_superuser}
                        onChange={() => isCreateModalOpen 
                          ? setCreateFormData({...createFormData, is_staff: false, is_superuser: false})
                          : setFormData({...formData, is_staff: false, is_superuser: false})
                        }
                        className="rounded"
                      />
                      <Label htmlFor="role_user" className="text-gray-300">User</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="role_staff"
                        name="role"
                        checked={isCreateModalOpen ? createFormData.is_staff && !createFormData.is_superuser : formData.is_staff && !formData.is_superuser}
                        onChange={() => isCreateModalOpen 
                          ? setCreateFormData({...createFormData, is_staff: true, is_superuser: false})
                          : setFormData({...formData, is_staff: true, is_superuser: false})
                        }
                        className="rounded"
                      />
                      <Label htmlFor="role_staff" className="text-gray-300">Staff</Label>
                    </div>
                    {!isCreateModalOpen && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="role_admin"
                          name="role"
                          checked={isCreateModalOpen ? createFormData.is_superuser : formData.is_superuser}
                          onChange={() => isCreateModalOpen 
                            ? setCreateFormData({...createFormData, is_staff: true, is_superuser: true})
                            : setFormData({...formData, is_staff: true, is_superuser: true})
                          }
                          className="rounded"
                        />
                        <Label htmlFor="role_admin" className="text-gray-300">Admin</Label>
                      </div>
                    )}
                  </div>
                </div>
                
                {!isCreateModalOpen && (
                  <div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="is_active" className="text-gray-300">Active</Label>
                    </div>
                  </div>
                )}
                
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
                        {isCreateModalOpen ? 'Tạo' : 'Lưu'}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (isCreateModalOpen) {
                        setIsCreateModalOpen(false)
                      } else {
                        setIsEditModalOpen(false)
                        setSelectedUser(null)
                      }
                    }}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Watch History Modal */}
      {isWatchHistoryModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white">
                Lịch sử xem phim: {selectedUser.username}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {watchHistory.length > 0 ? (
                  watchHistory.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 border border-gray-700 rounded-lg">
                      <img 
                        src={item.movie_poster || '/placeholder.jpg'} 
                        alt={item.movie_title}
                        className="w-12 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{item.movie_title}</h4>
                        <p className="text-gray-400 text-sm">
                          {new Date(item.watched_at).toLocaleDateString('vi-VN')}
                        </p>
                        <div className="flex items-center mt-1">
                          <div className="w-24 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 ml-2">{item.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-8">Chưa có lịch sử xem phim</p>
                )}
              </div>
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsWatchHistoryModalOpen(false)
                    setSelectedUser(null)
                    setWatchHistory([])
                  }}
                  className="w-full"
                >
                  Đóng
                </Button>
              </div>
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
