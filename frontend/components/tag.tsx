"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

interface TagProps {
  text: string
  categoryId?: number
  className?: string
  onClick?: () => void
}

export function Tag({ text, categoryId, className = "", onClick }: TagProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (categoryId) {
      // Navigate to categories page with this category selected
      router.push(`/categories?category=${categoryId}`)
    }
  }

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        categoryId
          ? "bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
          : "bg-muted text-muted-foreground"
      } ${className}`}
    >
      {text}
    </motion.button>
  )
}
