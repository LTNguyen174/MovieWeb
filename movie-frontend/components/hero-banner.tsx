"use client"

import { motion } from "framer-motion"
import { Play, Plus, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeroBannerProps {
  movie?: {
    title: string
    description: string
    poster: string
    release_year: number
    categories: { id: number; name: string }[]
  }
}

export function HeroBanner({ movie }: HeroBannerProps) {
  const defaultMovie = {
    title: "Inception",
    description:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
    poster: "/epic-sci-fi-movie-scene-with-dream-landscape.jpg",
    release_year: 2010,
    categories: [
      { id: 1, name: "Sci-Fi" },
      { id: 2, name: "Action" },
      { id: 3, name: "Thriller" },
    ],
  }

  const displayMovie = movie || defaultMovie

  return (
    <div className="relative h-[70vh] md:h-[85vh] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${displayMovie.poster}')` }}>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          {/* Categories */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 mb-4"
          >
            {displayMovie.categories.map((category) => (
              <span
                key={category.id}
                className="px-3 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full border border-primary/30"
              >
                {category.name}
              </span>
            ))}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-balance"
          >
            {displayMovie.title}
          </motion.h1>

          {/* Year */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground mb-4"
          >
            {displayMovie.release_year}
          </motion.p>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground text-sm md:text-base lg:text-lg mb-8 line-clamp-3 md:line-clamp-4"
          >
            {displayMovie.description}
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap gap-4"
          >
            <Button size="lg" className="rounded-full gap-2 text-base">
              <Play className="w-5 h-5 fill-current" />
              Watch Now
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full gap-2 text-base">
              <Plus className="w-5 h-5" />
              My List
            </Button>
            <Button size="lg" variant="outline" className="rounded-full gap-2 text-base bg-transparent">
              <Info className="w-5 h-5" />
              More Info
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
