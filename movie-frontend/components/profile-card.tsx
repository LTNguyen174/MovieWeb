"use client"

import { motion } from "framer-motion"
import { Camera, Mail, Calendar } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface ProfileCardProps {
  user?: {
    username: string
    email: string
    avatar?: string
    joinedAt: string
  }
}

export function ProfileCard({ user }: ProfileCardProps) {
  const defaultUser = {
    username: "John Doe",
    email: "john@example.com",
    avatar: undefined,
    joinedAt: "2024-01-15",
  }

  const displayUser = user || defaultUser

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-card border border-border"
    >
      <div className="relative">
        <Avatar className="w-24 h-24 md:w-32 md:h-32">
          <AvatarImage src={displayUser.avatar || "/placeholder.svg"} alt={displayUser.username} />
          <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
            {displayUser.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8">
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{displayUser.username}</h1>

        <div className="flex flex-col md:flex-row gap-4 text-muted-foreground">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{displayUser.email}</span>
          </div>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Joined {new Date(displayUser.joinedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <Button variant="outline" className="rounded-full bg-transparent">
        Edit Profile
      </Button>
    </motion.div>
  )
}
