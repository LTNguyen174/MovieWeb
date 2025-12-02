"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProfileCard } from "@/components/profile-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { profileAPI, type UserProfile } from "@/lib/api"

export default function EditProfilePage() {
  const { isAuthenticated, user, updateUserNickname } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    ;(async () => {
      try {
        const p = await profileAPI.getProfile()
        setProfile(p)
      } catch (e) {
        console.error("Failed to load profile", e)
      }
    })()
  }, [isAuthenticated, router])

  const handleAvatarChange = async (file: File | null) => {
    if (!file) return
    setPendingAvatar(file)
    setShowAvatarDialog(true)
  }

  if (!profile && isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          <p className="text-sm text-muted-foreground">Đang tải thông tin cá nhân...</p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-8">
        {/* Header với avatar + tên + nút Edit */}
        <ProfileCard
          user={{
            username: profile?.username || user?.username || "User",
            nickname: profile?.nickname || user?.nickname || null,
            email: profile?.email || "",
            avatar: previewAvatar || profile?.avatar || undefined,
            joinedAt: profile ? profile.date_of_birth || new Date().toISOString() : new Date().toISOString(),
          }}
          onEditProfile={() => {}}
          onChangeAvatar={handleAvatarChange}
        />

        {/* Form chỉnh sửa thông tin cá nhân */}
        <section className="max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Thông tin cá nhân</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push("/profile")}>
              Quay lại profile
            </Button>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!profile) return
              const form = e.target as HTMLFormElement
              const formData = new FormData(form)
              try {
                setSaving(true)
                const updated = await profileAPI.updateProfile({
                  username: (formData.get("username") as string) || undefined,
                  nickname: (formData.get("nickname") as string) || null,
                  date_of_birth: (formData.get("date_of_birth") as string) || undefined,
                  country: (formData.get("country") as string) || undefined,
                })
                setProfile(updated)
                // Cập nhật nickname trong context ngay lập tức
                updateUserNickname(updated.nickname || null)
                alert("Cập nhật thông tin thành công.")
                router.push("/profile")
              } catch (err: any) {
                console.error("Failed to update profile", err)
                const errorMessage = err?.message || "Cập nhật thông tin thất bại."
                alert(errorMessage)
              } finally {
                setSaving(false)
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" defaultValue={profile?.username || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input id="nickname" name="nickname" defaultValue={profile?.nickname || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Ngày sinh</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={profile?.date_of_birth || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Quốc gia</Label>
              <Input id="country" name="country" defaultValue={profile?.country || ""} />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </form>
        </section>
      </main>

      {/* Avatar confirm dialog */}
      {showAvatarDialog && pendingAvatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-semibold">Đổi ảnh đại diện</h2>
            <p className="text-sm text-muted-foreground">
              Bạn có chắc muốn sử dụng ảnh này làm ảnh đại diện mới?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowAvatarDialog(false)
                  setPendingAvatar(null)
                }}
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const file = pendingAvatar
                  setShowAvatarDialog(false)
                  setPendingAvatar(null)
                  if (!file) return

                  const objectUrl = URL.createObjectURL(file)
                  setPreviewAvatar(objectUrl)

                  try {
                    setSaving(true)
                    const updated = await profileAPI.updateProfile({ avatarFile: file })
                    setProfile(updated)
                    setPreviewAvatar(null)
                    URL.revokeObjectURL(objectUrl)
                  } catch (e: any) {
                    console.error("Failed to update avatar", e)
                    const errorMessage = e?.message || "Không thể cập nhật ảnh đại diện."
                    alert(errorMessage)
                    setPreviewAvatar(null)
                    URL.revokeObjectURL(objectUrl)
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                Đồng ý
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}


