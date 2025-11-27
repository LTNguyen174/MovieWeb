"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { MoreVertical, Trash2, Edit2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Comment {
  id: number
  username: string
  content: string
  created_at: string
  avatar?: string
}

interface CommentItemProps {
  comment: Comment
  isOwner?: boolean
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
  index?: number
}

export function CommentItem({ comment, isOwner = false, onEdit, onDelete, index = 0 }: CommentItemProps) {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex gap-4 p-4 rounded-xl bg-card/50 border border-border/50"
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={comment.avatar || "/placeholder.svg"} alt={comment.username} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {comment.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.username}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(comment.id)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(comment.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>
      </div>
    </motion.div>
  )
}
