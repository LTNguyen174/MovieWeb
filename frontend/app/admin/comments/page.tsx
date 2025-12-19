"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, Edit, Trash2, Loader2, MessageSquare, Eye, 
  Film, User, Clock, AlertCircle, CheckCircle, Save,
  Reply, ThumbsUp, ThumbsDown
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { AdminSidebar } from "@/components/admin-sidebar"

interface AdminComment {
  id: number
  content: string
  created_at: string
  user: {
    id: number
    username: string
    nickname?: string
  }
  movie: {
    id: number
    title: string
    poster?: string
    tmdb_id: number
  }
  parent?: {
    id: number
    content: string
    user: {
      username: string
    }
  }
  likes_count?: number
  dislikes_count?: number
  replies_count?: number
}

export default function CommentManagementPage() {
  const [comments, setComments] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedComment, setSelectedComment] = useState<AdminComment | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1
  })

  const [formData, setFormData] = useState({
    content: ""
  })

  const fetchComments = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: page.toString() })
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetchWithAuth(`/api/admin/comments/?${params}`)
      if (!response.ok) throw new Error('Failed to fetch comments')
      
      const data = await response.json()
      setComments(data.results || [])
      setPagination({
        count: data.count || 0,
        next: data.next,
        previous: data.previous,
        currentPage: page
      })
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComments(1)
  }, [searchTerm])

  const handleEdit = (comment: AdminComment) => {
    setSelectedComment(comment)
    setFormData({
      content: comment.content
    })
    setIsEditModalOpen(true)
  }

  const handleView = (comment: AdminComment) => {
    setSelectedComment(comment)
    setIsViewModalOpen(true)
  }

  const handleDelete = async (comment: AdminComment) => {
    if (!confirm('Bạn có chắc chắn muốn xóa comment này?')) {
      return
    }

    try {
      const response = await fetchWithAuth(`/api/admin/comments/${comment.id}/delete_comment/`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to delete comment')
      }

      fetchComments(pagination.currentPage)
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComment) return

    setIsSubmitting(true)

    try {
      const response = await fetchWithAuth(`/api/admin/comments/${selectedComment.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to update comment')
      }

      setIsEditModalOpen(false)
      setSelectedComment(null)
      fetchComments(pagination.currentPage)
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Failed to update comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 mt-20">
          <h1 className="text-3xl font-bold text-white mb-2">Quản lý Comments</h1>
          <p className="text-gray-300">Quản lý danh sách bình luận của người dùng</p>
        </div>

        {/* Search and Actions */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm comment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Table */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Danh sách Comments ({pagination.count} comments)
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
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-4 border border-gray-700 rounded-lg hover:bg-gray-700/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header with user and movie info */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-400" />
                              <span className="text-blue-400 font-medium">
                                {comment.user.nickname || comment.user.username}
                              </span>
                            </div>
                            <span className="text-gray-500">→</span>
                            <div className="flex items-center gap-2">
                              <Film className="w-4 h-4 text-green-400" />
                              <Link 
                                href={`/movie/${comment.movie.tmdb_id}`}
                                className="text-green-400 hover:text-green-300 font-medium"
                              >
                                {comment.movie.title}
                              </Link>
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <Clock className="w-3 h-3" />
                              {formatDate(comment.created_at)}
                            </div>
                          </div>

                          {/* Reply indicator */}
                          {comment.parent && (
                            <div className="mb-2 p-2 bg-gray-700/50 rounded border-l-2 border-blue-500">
                              <div className="text-xs text-blue-400 mb-1">
                                Trả lời {comment.parent.user.username}:
                              </div>
                              <div className="text-sm text-gray-300">
                                "{truncateContent(comment.parent.content, 80)}"
                              </div>
                            </div>
                          )}

                          {/* Comment content */}
                          <p className="text-gray-200 mb-3">
                            {truncateContent(comment.content, 200)}
                          </p>

                          {/* Stats and actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                Comment ID: {comment.id}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleView(comment)}
                                className="h-8 w-8 p-0"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(comment)}
                                className="h-8 w-8 p-0"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(comment)}
                                className="h-8 w-8 p-0"
                                title="Xóa comment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {pagination.count > 30 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                    <div className="text-sm text-gray-400">
                      Hiển thị {comments.length} / {pagination.count} comments
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchComments(pagination.currentPage - 1)}
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
                        onClick={() => fetchComments(pagination.currentPage + 1)}
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

      {/* Edit Comment Modal */}
      {isEditModalOpen && selectedComment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle className="text-white">
                Chỉnh sửa Comment
              </CardTitle>
              <div className="text-sm text-gray-400">
                bởi {selectedComment.user.nickname || selectedComment.user.username} 
                • trên phim "{selectedComment.movie.title}"
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-gray-300">Nội dung comment</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
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
                        Lưu thay đổi
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditModalOpen(false)
                      setSelectedComment(null)
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

      {/* View Comment Modal */}
      {isViewModalOpen && selectedComment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white">Chi tiết Comment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* User and Movie Info */}
                <div className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-blue-400 font-medium">
                        {selectedComment.user.nickname || selectedComment.user.username}
                      </div>
                      <div className="text-xs text-gray-400">User ID: {selectedComment.user.id}</div>
                    </div>
                  </div>
                  <div className="text-gray-500">→</div>
                  <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-green-400" />
                    <div>
                      <Link 
                        href={`/movie/${selectedComment.movie.tmdb_id}`}
                        className="text-green-400 hover:text-green-300 font-medium"
                      >
                        {selectedComment.movie.title}
                      </Link>
                      <div className="text-xs text-gray-400">Movie ID: {selectedComment.movie.id} • TMDB ID: {selectedComment.movie.tmdb_id}</div>
                    </div>
                  </div>
                </div>

                {/* Reply Info */}
                {selectedComment.parent && (
                  <div className="p-3 bg-blue-900/20 rounded-lg border-l-2 border-blue-500">
                    <div className="text-sm text-blue-400 mb-2">
                      Trả lời comment của {selectedComment.parent.user.username}:
                    </div>
                    <div className="text-sm text-gray-300 bg-gray-700/50 p-2 rounded">
                      {selectedComment.parent.content}
                    </div>
                  </div>
                )}

                {/* Comment Content */}
                <div>
                  <Label className="text-gray-300 mb-2 block">Nội dung comment:</Label>
                  <div className="bg-gray-700/50 p-3 rounded-lg text-gray-200">
                    {selectedComment.content}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-sm text-gray-400 text-center">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Đã tạo: {formatDate(selectedComment.created_at)}
                </div>
              </div>
              
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewModalOpen(false)
                    setSelectedComment(null)
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
