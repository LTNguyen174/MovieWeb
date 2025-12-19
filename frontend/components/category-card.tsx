"use client"

import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"

interface CategoryCardProps {
  category: {
    id: number
    name: string
    movieCount?: number
  }
  index?: number
}

export function CategoryCard({ category, index = 0 }: CategoryCardProps) {
  const gradients = [
    "from-red-500/20 to-orange-500/20",
    "from-blue-500/20 to-cyan-500/20",
    "from-green-500/20 to-emerald-500/20",
    "from-purple-500/20 to-pink-500/20",
    "from-yellow-500/20 to-amber-500/20",
    "from-indigo-500/20 to-violet-500/20",
    "from-rose-500/20 to-red-500/20",
    "from-teal-500/20 to-green-500/20",
  ]

  const gradient = gradients[index % gradients.length]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.03 }}
    >
      <div
        className={`relative p-6 pr-12 rounded-2xl bg-gradient-to-br ${gradient} border border-border/50 group cursor-pointer overflow-hidden min-h-28 md:min-h-32 flex items-start`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{category.name}</h3>

          {category.movieCount !== undefined && (
            <p className="text-muted-foreground text-sm">{category.movieCount} movies</p>
          )}
        </div>

        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </motion.div>
  )
}
