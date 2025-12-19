"use client"

import { motion } from "framer-motion"
import { Download, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface TMDBMovie {
  tmdb_id: number
  title: string
  poster_path: string
  release_date: string
}

interface AdminTableProps {
  movies?: TMDBMovie[]
  onImport?: (tmdbId: number) => void
  isLoading?: boolean
}

export function AdminTable({ movies, onImport, isLoading }: AdminTableProps) {
  const defaultMovies: TMDBMovie[] = [
    { tmdb_id: 101, title: "The Terminator", poster_path: "/poster1.jpg", release_date: "1984-10-26" },
    { tmdb_id: 102, title: "Terminator 2: Judgment Day", poster_path: "/poster2.jpg", release_date: "1991-07-03" },
    {
      tmdb_id: 103,
      title: "Terminator 3: Rise of the Machines",
      poster_path: "/poster3.jpg",
      release_date: "2003-07-02",
    },
    { tmdb_id: 104, title: "Terminator Salvation", poster_path: "/poster4.jpg", release_date: "2009-05-21" },
    { tmdb_id: 105, title: "Terminator Genisys", poster_path: "/poster5.jpg", release_date: "2015-07-01" },
  ]

  const displayMovies = movies || defaultMovies

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (displayMovies.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">No movies found. Try a different search query.</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl border border-border overflow-hidden"
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[80px]">Poster</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[120px]">Release Date</TableHead>
            <TableHead className="w-[100px]">TMDB ID</TableHead>
            <TableHead className="w-[120px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayMovies.map((movie, index) => (
            <motion.tr
              key={movie.tmdb_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <TableCell>
                <img
                  src={`/.jpg?height=80&width=55&query=${encodeURIComponent(movie.title)} movie poster`}
                  alt={movie.title}
                  className="w-14 h-20 object-cover rounded-md"
                />
              </TableCell>
              <TableCell className="font-medium">{movie.title}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(movie.release_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  {movie.tmdb_id}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => onImport?.(movie.tmdb_id)} className="gap-1">
                  <Download className="w-4 h-4" />
                  Import
                </Button>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </motion.div>
  )
}
