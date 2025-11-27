"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface CommentInputBoxProps {
  onSubmit?: (content: string) => void
  placeholder?: string
  username?: string
  avatar?: string
}

export function CommentInputBox({
  onSubmit,
  placeholder = "Write a comment...",
  username = "User",
  avatar,
}: CommentInputBoxProps) {
  const [content, setContent] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim() && onSubmit) {
      onSubmit(content.trim())
      setContent("")
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4"
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={avatar || "/placeholder.svg"} alt={username} />
        <AvatarFallback className="bg-primary/10 text-primary">{username.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-3">
        <motion.div
          animate={{
            boxShadow: isFocused ? "0 0 0 2px var(--primary)" : "none",
          }}
          className="rounded-xl overflow-hidden"
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            rows={3}
            className="resize-none border-0 bg-card focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </motion.div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!content.trim()} className="rounded-full gap-2">
            <Send className="w-4 h-4" />
            Post Comment
          </Button>
        </div>
      </div>
    </motion.form>
  )
}
