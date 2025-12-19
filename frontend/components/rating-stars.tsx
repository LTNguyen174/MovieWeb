"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingStarsProps {
  rating?: number
  maxRating?: number
  readonly?: boolean
  size?: "sm" | "md" | "lg"
  onRate?: (rating: number) => void
}

export function RatingStars({ rating = 0, maxRating = 5, readonly = false, size = "md", onRate }: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  const handleClick = (value: number) => {
    if (!readonly && onRate) {
      onRate(value)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, i) => {
        const value = i + 1
        const isFilled = value <= (hoverRating || rating)

        return (
          <motion.button
            key={i}
            type="button"
            disabled={readonly}
            whileHover={readonly ? {} : { scale: 1.2 }}
            whileTap={readonly ? {} : { scale: 0.9 }}
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readonly && setHoverRating(value)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={cn("transition-colors", readonly ? "cursor-default" : "cursor-pointer")}
          >
            <Star
              className={cn(sizeClasses[size], isFilled ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")}
            />
          </motion.button>
        )
      })}
      {rating > 0 && <span className="ml-2 text-muted-foreground text-sm">{rating.toFixed(1)}</span>}
    </div>
  )
}
