// Hook quản lý authentication state
"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { authAPI, profileAPI, getAccessToken, clearTokens } from "@/lib/api"
import { useRouter } from "next/navigation"

interface User {
  username: string
  nickname?: string | null
  isAdmin: boolean
  isSuperUser?: boolean
  date_joined?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  googleLogin: () => void
  logout: () => void
  updateUserNickname: (nickname: string | null) => void
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    console.log("=== AuthProvider useEffect started ===")
    // Check if user is logged in on mount
    const token = getAccessToken()
    console.log("useAuth: token on mount", token ? "exists" : "null")
    
    if (token) {
      try {
        // Decode JWT và kiểm tra expiration
        const payload = JSON.parse(atob(token.split(".")[1]))
        const currentTime = Date.now() / 1000
        console.log("useAuth: token payload", { 
          username: payload.username, 
          exp: payload.exp, 
          currentTime,
          timeUntilExp: payload.exp ? payload.exp - currentTime : 'unknown'
        })
        
        // Kiểm tra token có hết hạn không
        if (payload.exp && payload.exp < currentTime) {
          console.log("useAuth: token expired, clearing")
          // Token hết hạn, xóa và không set user
          clearTokens()
          setIsLoading(false)
          return
        }
        
        const username = payload.username || "User"
        console.log("useAuth: setting user", username)
        setUser({
          username: username,
          nickname: null, // Will be loaded from profile
          isAdmin: Boolean(payload.is_staff), // Ensure isAdmin is always boolean
          isSuperUser: Boolean(payload.is_superuser), // Add superuser field
        })
        
        // Load profile to get nickname (async, không block)
        profileAPI.getProfile().then(profile => {
          console.log("useAuth: profile loaded", profile.nickname)
          setUser(prev => prev ? ({
            ...prev,
            username: profile.username,
            nickname: profile.nickname,
            date_joined: profile.date_joined,
            isAdmin: Boolean(prev.isAdmin), // Ensure isAdmin is always boolean
          }) : null)
        }).catch((e) => {
          console.error("useAuth: profile load failed", e)
          // Ignore profile load errors, user still logged in
        })
      } catch (error) {
        console.error("useAuth: token decode failed", error)
        // Token invalid, clear và không set user
        clearTokens()
      }
    } else {
      console.log("useAuth: no token found")
    }
    setIsLoading(false)
    console.log("=== AuthProvider useEffect completed ===")
  }, [])

  const login = async (username: string, password: string) => {
    const tokens = await authAPI.login(username, password)
    const payload = JSON.parse(atob(tokens.access.split(".")[1]))
    const loggedInUser = {
      username: payload.username || username,
      nickname: null,
      isAdmin: payload.is_staff || false,
      isSuperUser: payload.is_superuser || false,
    }
    setUser(loggedInUser)
    
    // Load profile to get nickname after login
    try {
      const profile = await profileAPI.getProfile()
      setUser(prev => prev ? { ...prev, nickname: profile.nickname } : null)
    } catch {
      // Ignore profile load errors, user still logged in
    }
  }

  const register = async (username: string, email: string, password: string) => {
    await authAPI.register(username, email, password)
    // Auto login after register
    await login(username, password)
  }

  const googleLogin = () => {
    const authUrl = authAPI.getGoogleAuthUrl()
    window.location.href = authUrl
  }

  const logout = () => {
    console.log("useAuth: logout called")
    authAPI.logout()
    setUser(null)
    router.push("/login")
  }

  const updateUserNickname = (nickname: string | null) => {
    if (user) {
      setUser({ ...user, nickname })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        googleLogin,
        logout,
        updateUserNickname,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
