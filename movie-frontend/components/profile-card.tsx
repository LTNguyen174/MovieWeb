"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Camera, Mail, Calendar } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface ProfileCardProps {
  user?: {
    username: string
    nickname?: string | null
    email: string
    avatar?: string | null
    date_joined?: string
  }
  onEditProfile?: () => void
  onChangeAvatar?: (file: File) => void
}

export function ProfileCard({ user, onEditProfile, onChangeAvatar }: ProfileCardProps) {
  const [imageLoading, setImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  
  const defaultUser = {
    username: "John Doe",
    nickname: null,
    email: "john@example.com",
    avatar: undefined,
    date_joined: new Date().toISOString(),
  }

  const displayUser = user || defaultUser
  const displayName = displayUser.nickname || displayUser.username
  const hasAvatar = displayUser.avatar && !imageError

  const handleImageLoadingStatusChange = (status: "idle" | "loading" | "loaded" | "error") => {
    if (status === "loaded") {
      setImageLoading(false)
      setImageError(false)
    } else if (status === "error") {
      setImageLoading(false)
      setImageError(true)
    } else if (status === "loading") {
      setImageLoading(true)
      setImageError(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-card border border-border"
    >
      <div className="relative">
        <Avatar className="w-24 h-24 md:w-32 md:h-32">
          {hasAvatar && (
            <AvatarImage 
              src={displayUser.avatar || undefined} 
              alt={displayName}
              onLoadingStatusChange={handleImageLoadingStatusChange}
            />
          )}
          <AvatarFallback 
            className={`bg-primary/10 text-primary text-3xl font-bold transition-opacity duration-300 ${
              hasAvatar && !imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <label className="absolute bottom-0 right-0 rounded-full h-8 w-8 flex items-center justify-center bg-secondary cursor-pointer">
          <Camera className="w-4 h-4" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onChangeAvatar?.(file)
            }}
          />
        </label>
      </div>

      <div className="flex-1 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{displayName}</h1>

        <div className="flex flex-col md:flex-row gap-4 text-muted-foreground">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{displayUser.email}</span>
          </div>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Joined {new Date(displayUser.date_joined || new Date()).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="rounded-full bg-transparent hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
        type="button"
        onClick={onEditProfile}
      >
        Edit Profile
      </Button>
    </motion.div>
  )
}
