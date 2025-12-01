"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Lock, Eye, EyeOff } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProfileCard } from "@/components/profile-card"
import { ProfileTabs } from "@/components/profile-tabs"
import { MovieCard } from "@/components/movie-card"
import { CommentItem } from "@/components/comment-item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { profileAPI, commentsAPI } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("favorites")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [favorites, setFavorites] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [history, setHistory] = useState<{ movie: any; last_watched_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  // Protect route
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  // Fetch profile data
  const loadProfileData = async () => {
    let mounted = true
    setLoading(true)
    setError("")
    try {
      // Fetch independently so one failure doesn't block others
      try {
        const fav = await profileAPI.getFavorites()
        if (mounted) setFavorites(Array.isArray(fav) ? fav : [])
      } catch (e) {
        console.error("Load favorites failed", e)
      }

      try {
        const com = await profileAPI.getMyComments()
        if (mounted) setComments(Array.isArray(com) ? com : [])
      } catch (e) {
        console.error("Load comments failed", e)
      }

      try {
        const his = await profileAPI.getHistory()
        if (mounted) setHistory(Array.isArray(his) ? his : [])
      } catch (e) {
        console.error("Load history failed", e)
      }
    } finally {
      if (mounted) setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) loadProfileData()
  }, [isAuthenticated])

  // Refresh data when page gains focus (user navigates back from movie page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        loadProfileData()
      }
    }

    const handleFocus = () => {
      if (isAuthenticated) {
        loadProfileData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated])

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "Vui lòng điền đầy đủ thông tin." })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Hai mật khẩu mới không khớp." })
      return
    }
    try {
      await profileAPI.changePassword(oldPassword, newPassword, confirmPassword)
      setPasswordMsg({ type: "success", text: "Đổi mật khẩu thành công." })
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err?.message || "Đổi mật khẩu thất bại." })
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Profile Header */}
        <section className="mb-12">
          <ProfileCard user={{ username: user?.username || "User", email: "", joinedAt: new Date().toISOString() }} />
        </section>

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {activeTab === "favorites" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {loading && <p className="col-span-full text-sm text-muted-foreground">Đang tải mục yêu thích...</p>}
              {error && <p className="col-span-full text-sm text-red-500">{error}</p>}
              {!loading && Array.isArray(favorites) && favorites.map((fav: any, index: number) => (
                <MovieCard key={fav.movie?.tmdb_id ?? index} movie={fav.movie} index={index} />
              ))}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-4 max-w-3xl">
              {loading && <p className="text-sm text-muted-foreground">Đang tải bình luận...</p>}
              {error && <p className="text-sm text-red-500">{error}</p>}
              {!loading && comments.map((comment, index) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isOwner={true}
                  index={index}
                  showReplies={false}
                  onEdit={async (id) => {
                    const current = comments.find((c: any) => c.id === id)
                    const content = window.prompt("Edit your comment", current?.content || "")
                    if (content === null) return
                    try {
                      await commentsAPI.updateComment(id, content)
                      const updated = await profileAPI.getMyComments()
                      setComments(updated)
                    } catch (e) {
                      alert("Không thể sửa bình luận.")
                    }
                  }}
                  onDelete={async (id) => {
                    if (!window.confirm("Xóa bình luận này?")) return
                    try {
                      await commentsAPI.deleteComment(id)
                      setComments((prev: any[]) => prev.filter((c) => c.id !== id))
                    } catch (e) {
                      alert("Không thể xóa bình luận.")
                    }
                  }}
                />
              ))}
            </div>
          )}

          {activeTab === "history" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {loading && <p className="col-span-full text-sm text-muted-foreground">Đang tải lịch sử xem...</p>}
              {error && <p className="col-span-full text-sm text-red-500">{error}</p>}
              {!loading && Array.isArray(history) && history.map((item, idx) => (
                <MovieCard key={item.movie?.tmdb_id ?? idx} movie={item.movie} index={idx} />
              ))}
            </div>
          )}

          {activeTab === "password" && (
            <div className="max-w-md">
              <form className="space-y-6" onSubmit={onChangePassword}>
                {passwordMsg && (
                  <p className={`text-sm ${passwordMsg.type === "error" ? "text-red-500" : "text-green-500"}`}>{
                    passwordMsg.text
                  }</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="oldPassword"
                      type={showOldPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      className="pl-10 pr-10 h-12 rounded-xl"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="pl-10 pr-10 h-12 rounded-xl"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      className="pl-10 h-12 rounded-xl"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl">
                  Update Password
                </Button>
              </form>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
