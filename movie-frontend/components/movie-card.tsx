"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Play, Star, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Movie {
  tmdb_id: number
  title: string
  poster: string
  release_year: number
  categories: { id: number; name: string }[]
  average_rating?: number
}

interface MovieCardProps {
  movie: Movie
  index?: number
}

export function MovieCard({ movie, index = 0 }: MovieCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.03 }}
      className="group relative"
    >
      <Link href={`/movie/${movie.tmdb_id}`}>
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-card shadow-lg">
          {/* Poster Image */}
          <img
            src={movie.poster || "/placeholder.svg"}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Rating Badge */}
          {movie.average_rating && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-medium">{movie.average_rating.toFixed(1)}</span>
            </div>
          )}

          {/* Hover Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <div className="flex gap-2 mb-3">
              <Button
                size="sm"
                className="rounded-full flex-1 gap-1"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.location.href = `/watch/${movie.tmdb_id}`
                }}
              >
                <Play className="w-4 h-4 fill-current" />
                Play
              </Button>
              <Button size="sm" variant="secondary" className="rounded-full">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {movie.categories.slice(0, 2).map((category) => (
                <span key={category.id} className="text-xs bg-muted/80 px-2 py-0.5 rounded-full">
                  {category.name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </Link>

      {/* Title & Year */}
      <div className="mt-3 px-1">
        <h3 className="font-semibold text-sm md:text-base line-clamp-1 group-hover:text-primary transition-colors">
          {movie.title}
        </h3>
        <p className="text-muted-foreground text-xs md:text-sm">{movie.release_year}</p>
      </div>
    </motion.div>
  )
}
