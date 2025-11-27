"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  onSearch?: (query: string) => void
  placeholder?: string
}

export function SearchBar({ onSearch, placeholder = "Search movies..." }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      // Gửi query ngay cả khi empty để clear search
      onSearch(query.trim())
    }
  }

  const clearSearch = () => {
    setQuery("")
    if (onSearch) {
      onSearch("")
    }
  }

  return (
    <motion.form
      onSubmit={handleSearch}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative">
        <motion.div
          animate={{
            boxShadow: isFocused
              ? "0 0 0 2px var(--primary), 0 4px 20px rgba(0,0,0,0.3)"
              : "0 4px 20px rgba(0,0,0,0.2)",
          }}
          className="relative flex items-center bg-card rounded-full overflow-hidden"
        >
          <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="pl-12 pr-24 py-6 bg-transparent border-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="absolute right-2 flex items-center gap-2">
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={clearSearch}
                  className="p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
            <Button type="submit" size="sm" className="rounded-full">
              Search
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.form>
  )
}
