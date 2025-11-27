// Hook quản lý authentication state
"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { authAPI, getAccessToken, clearTokens } from "@/lib/api"

interface User {
  username: string
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const token = getAccessToken()
    if (token) {
      // Decode JWT to get user info (basic decode, không verify)
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        setUser({
          username: payload.username || "User",
          isAdmin: payload.is_staff || false,
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
    setUser({
      username: payload.username || username,
      isAdmin: payload.is_staff || false,
    })
  }

  const register = async (username: string, email: string, password: string) => {
    await authAPI.register(username, email, password)
    // Auto login after register
    await login(username, password)
  }

  const logout = () => {
    authAPI.logout()
    setUser(null)
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
