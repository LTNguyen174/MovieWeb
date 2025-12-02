// Hook quản lý authentication state
"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { authAPI, profileAPI, getAccessToken, clearTokens } from "@/lib/api"
import { useRouter } from "next/navigation"

interface User {
  username: string
  nickname?: string | null
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUserNickname: (nickname: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in on mount
    const token = getAccessToken()
    if (token) {
      // Decode JWT to get user info (basic decode, không verify)
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        const username = payload.username || "User"
        setUser({
          username: username,
          nickname: null, // Will be loaded from profile
          isAdmin: payload.is_staff || false,
        })
        
        // Load profile to get nickname
        profileAPI.getProfile().then(profile => {
          setUser(prev => prev ? { ...prev, nickname: profile.nickname } : null)
        }).catch(() => {
          // Ignore profile load errors, user still logged in
        })
      } catch {
        clearTokens()
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const tokens = await authAPI.login(username, password)
    const payload = JSON.parse(atob(tokens.access.split(".")[1]))
    const loggedInUser = {
      username: payload.username || username,
      nickname: null, // Will be loaded from profile
      isAdmin: payload.is_staff || false,
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

  const logout = () => {
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
        logout,
        updateUserNickname,
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
