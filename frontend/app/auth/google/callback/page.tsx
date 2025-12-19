"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { Film } from "lucide-react"

export default function GoogleCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Đang xử lý đăng nhập Google...")
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, setUser } = useAuth()

  useEffect(() => {
    const handleGoogleCallback = async () => {
      // Prevent duplicate requests
      if (isProcessing) return
      setIsProcessing(true)
      try {
        const code = searchParams.get("code")
        const error = searchParams.get("error")
        
        console.log("Callback page - code:", code?.substring(0, 20) + "...")
        console.log("Callback page - error:", error)

        if (error) {
          setStatus("error")
          setMessage(`Đăng nhập Google thất bại: ${error}`)
          setTimeout(() => router.push("/login"), 3000)
          return
        }

        if (!code) {
          setStatus("error")
          setMessage("Không nhận được mã xác thực từ Google")
          setTimeout(() => router.push("/login"), 3000)
          return
        }

        setMessage("Đang xác thực với Google...")
        const tokens = await authAPI.googleLogin(code)

        setMessage("Đăng nhập thành công! Đang chuyển hướng...")
        setStatus("success")

        // Google OAuth API returns user info in response.user (username, email, etc.)
        // JWT token contains role fields (is_staff, is_superuser) but not username
        // So we use both sources: username from API response, roles from JWT token
        const payload = JSON.parse(atob(tokens.access.split(".")[1]))
        const loggedInUser = {
          username: tokens.user?.username || "Google User",
          nickname: null,
          isAdmin: payload.is_staff || false,
          isSuperUser: payload.is_superuser || false,
        }

        // Update auth state immediately after successful Google login
        setUser(loggedInUser)
        
        // Redirect to homepage
        setTimeout(() => {
          router.push("/")
        }, 1500)

      } catch (error) {
        console.error("Google callback error:", error)
        setStatus("error")
        setMessage("Đăng nhập Google thất bại. Vui lòng thử lại.")
        setTimeout(() => router.push("/login"), 3000)
      }
    }

    handleGoogleCallback()
  }, [searchParams, router, login, isProcessing])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto p-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Film className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">CineStream</span>
          </div>
        </div>

        {/* Status Icon */}
        <div className="flex justify-center">
          {status === "loading" && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          )}
          {status === "success" && (
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">
            {status === "loading" && "Đang đăng nhập..."}
            {status === "success" && "Đăng nhập thành công!"}
            {status === "error" && "Đăng nhập thất bại"}
          </h1>
          <p className="text-muted-foreground">
            {message}
          </p>
        </div>

        {/* Additional info for error state */}
        {status === "error" && (
          <p className="text-sm text-muted-foreground">
            Bạn sẽ được chuyển hướng đến trang đăng nhập trong vài giây...
          </p>
        )}
      </div>
    </div>
  )
}
