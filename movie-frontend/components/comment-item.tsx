"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { MoreVertical, Trash2, Edit2, ThumbsUp, ThumbsDown, Reply } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"

interface Comment {
  id: number
  username: string
  content: string
  created_at: string
  avatar?: string
  movie_title?: string
  movie_tmdb_id?: number
  likes_count?: number
  dislikes_count?: number
  user_reaction?: 'like' | 'dislike' | null
  replies?: Comment[]
  parent_username?: string | null
}

interface CommentItemProps {
  comment: Comment
  isOwner?: boolean
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
  onReply?: (parentId: number, content: string) => Promise<void> | void
  onReact?: (id: number, reaction: 'like' | 'dislike' | null) => Promise<void> | void
  index?: number
  showReplies?: boolean
}

export function CommentItem({ comment, isOwner = false, onEdit, onDelete, onReply, onReact, index = 0, showReplies = true }: CommentItemProps) {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")

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

        {comment.movie_title && (
          <div className="text-xs text-muted-foreground mb-2">
            On movie: {comment.movie_tmdb_id ? (
              <Link href={`/movie/${comment.movie_tmdb_id}`} className="underline hover:text-foreground">
                {comment.movie_title}
              </Link>
            ) : (
              <span>{comment.movie_title}</span>
            )}
          </div>
        )}

        {comment.parent_username && (
          <div className="text-xs text-muted-foreground mb-2">
            Replying to <span className="font-medium">@{comment.parent_username}</span>
          </div>
        )}

        <p className="text-sm text-muted-foreground leading-relaxed">{comment.content}</p>

        {/* Actions: Like / Dislike / Reply */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <button
            className={`flex items-center gap-1 hover:text-foreground ${comment.user_reaction === 'like' ? 'text-foreground' : ''}`}
            onClick={() => onReact?.(comment.id, comment.user_reaction === 'like' ? null : 'like')}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{comment.likes_count ?? 0}</span>
          </button>
          <button
            className={`flex items-center gap-1 hover:text-foreground ${comment.user_reaction === 'dislike' ? 'text-foreground' : ''}`}
            onClick={() => onReact?.(comment.id, comment.user_reaction === 'dislike' ? null : 'dislike')}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>{comment.dislikes_count ?? 0}</span>
          </button>
          <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setIsReplying((v) => !v)}>
            <Reply className="w-4 h-4" /> Reply
          </button>
        </div>

        {isReplying && (
          <div className="mt-3 pl-0 sm:pl-10">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              placeholder="Write a reply..."
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="rounded-full"
                disabled={!replyContent.trim()}
                onClick={async () => {
                  const content = replyContent.trim()
                  if (!content) return
                  await onReply?.(comment.id, content)
                  setReplyContent("")
                  setIsReplying(false)
                }}
              >
                Reply
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setIsReplying(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {showReplies && Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <div className="mt-4 space-y-3 pl-0 sm:pl-10">
            {comment.replies.map((rep, i) => (
              <CommentItem key={rep.id ?? `${rep.username}-${rep.created_at}-${i}`}
                comment={rep}
                index={i}
                onReply={onReply}
                onReact={onReact}
                showReplies={showReplies}
              />
            ))}
          </div>
        )}

      </div>
    </motion.div>
  )
}
