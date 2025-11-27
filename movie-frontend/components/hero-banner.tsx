"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Play, Plus, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { categoriesAPI, moviesAPI, type Movie } from "@/lib/api"

interface HeroBannerProps {
  movie?: {
    title: string
    description?: string
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

  const [slides, setSlides] = useState<Array<{
    title: string
    description?: string
    poster: string
    release_year: number
    categories: { id: number; name: string }[]
  }>>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data: any = await moviesAPI.getMovies({ page_size: 50 })
        const list: Movie[] = Array.isArray(data)
          ? data
          : (data && typeof data === "object" && Array.isArray((data as any).results)
              ? (data as any).results
              : [])

        // Sort by newest release_year first
        const sorted = [...list].sort((a: any, b: any) => {
          const ay = typeof a?.release_year === 'number' ? a.release_year : 0
          const by = typeof b?.release_year === 'number' ? b.release_year : 0
          return by - ay
        })

        const seen = new Set<number>()
        const items: Array<{
          title: string
          description?: string
          poster: string
          release_year: number
          categories: { id: number; name: string }[]
        }> = []

        for (const m of sorted) {
          if (m && typeof (m as any).tmdb_id === "number" && !seen.has((m as any).tmdb_id)) {
            seen.add((m as any).tmdb_id)
            let detail: any = null
            try {
              detail = await moviesAPI.getMovie((m as any).tmdb_id)
            } catch {}
            const desc = (detail && detail.description) || (m as any).description
            if (typeof desc === 'string' && desc.trim().length > 0) {
              items.push({
                title: m.title,
                description: desc,
                poster: m.poster,
                release_year: m.release_year,
                categories: Array.isArray(m.categories) ? m.categories : [],
              })
              if (items.length >= 5) break
            } else {
              // skip movies without description
              continue
            }
          }
        }

        if (mounted && items.length > 0) setSlides(items)
      } catch {
        // ignore global failure -> fallback to defaultMovie
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const displayMovie = (slides.length > 0 ? slides[index % slides.length] : undefined) || movie || defaultMovie

  const next = () => {
    if (slides.length === 0) return
    setIndex((i) => (i + 1) % slides.length)
  }
  const prev = () => {
    if (slides.length === 0) return
    setIndex((i) => (i - 1 + slides.length) % slides.length)
  }

  // Auto-advance every 10 seconds
  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 5000)
    return () => clearInterval(id)
  }, [slides.length])

  const truncate = (text?: string, max: number = 180) => {
    if (!text) return ""
    const s = text.trim()
    if (s.length <= max) return s
    return s.slice(0, max).replace(/\s+\S*$/, "") + "…"
  }

  return (
    <div className="relative h-[70vh] md:h-[85vh] w-full overflow-hidden">
      {/* Background Image */}
      <motion.div
        key={(displayMovie as any).poster}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${displayMovie.poster}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </motion.div>

      {/* Drag Layer */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) next()
          else if (info.offset.x > 50) prev()
        }}
        className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center cursor-grab active:cursor-grabbing"
      >
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
            {truncate(displayMovie.description, 180)}
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
        {/* Right-side Poster Image */}
        <motion.div
          key={(displayMovie as any).poster + "-side"}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="ml-auto hidden md:block"
        >
          <div className="relative w-56 md:w-72 lg:w-80 xl:w-96 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black/30 backdrop-blur-sm">
            {/* Use native img to avoid adding new imports */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayMovie.poster}
              alt={displayMovie.title}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-l from-background/30 via-transparent to-transparent" />
          </div>
        </motion.div>
      </motion.div>
      {/* Dots Indicators */}
      {(() => {
        const totalDots = slides.length > 0 ? slides.length : 1
        const active = slides.length > 0 ? index % slides.length : 0
        return (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {Array.from({ length: totalDots }).map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => slides.length > 0 && setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  i === active ? "bg-white shadow-md scale-110" : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        )
      })()}
    </div>
  )
}

