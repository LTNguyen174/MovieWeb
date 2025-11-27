"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { CategoryCard } from "@/components/category-card"
import { MovieGrid } from "@/components/movie-grid"
import { categoriesAPI, moviesAPI } from "@/lib/api"

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [categories, setCategories] = useState<Array<{ id: number; name: string; movieCount?: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const cats = await categoriesAPI.getCategories()
        const catList: Array<{ id: number; name: string }> = Array.isArray(cats)
          ? cats
          : (cats && typeof cats === "object" && Array.isArray((cats as any).results)
              ? (cats as any).results
              : [])

        // Nếu backend trả sẵn movie_count thì dùng trực tiếp
        const hasBackendCount = catList.length > 0 && (catList as any)[0].movie_count !== undefined
        if (hasBackendCount) {
          const mapped = (catList as any).map((c: any) => ({ id: c.id, name: c.name, movieCount: c.movie_count }))
          if (mounted) setCategories(mapped)
        } else {
          // Fallback: đếm thủ công bằng cách gọi movies theo từng category
          const withCounts = await Promise.all(
            catList.map(async (c) => {
              try {
                const data: any = await moviesAPI.getMovies({ categories: c.id })
                if (Array.isArray(data)) return { ...c, movieCount: data.length }
                if (data && typeof data === "object") {
                  if (typeof data.count === "number") return { ...c, movieCount: data.count }
                  if (Array.isArray(data.results)) return { ...c, movieCount: data.results.length }
                }
                return { ...c, movieCount: 0 }
              } catch {
                return { ...c, movieCount: 0 }
              }
            })
          )
          if (mounted) setCategories(withCounts)
        }
      } catch (e) {
        if (mounted) setError("Không thể tải danh mục")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Browse Categories</h1>
          <p className="text-muted-foreground text-lg">Explore our collection by genre</p>
        </motion.div>

        {/* Category Grid */}
        {!selectedCategory && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading && (
              <div className="col-span-full text-center text-muted-foreground py-8">Đang tải danh mục...</div>
            )}
            {error && (
              <div className="col-span-full text-center text-red-500 py-8">{error}</div>
            )}
            {!loading && !error && categories.map((category, index) => (
              <div key={category.id} onClick={() => setSelectedCategory(category.id)}>
                <CategoryCard category={category} index={index} />
              </div>
            ))}
          </div>
        )}

        {/* Selected Category Movies */}
        {selectedCategory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => setSelectedCategory(null)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary text-primary hover:border-white hover:text-white hover:bg-white/10 transition-colors"
              >
                <span aria-hidden>←</span>
                <span>Back to Categories</span>
              </button>
              <h2 className="text-2xl font-bold">{selectedCategoryName}</h2>
            </div>
            <MovieGrid categoryId={selectedCategory} title={selectedCategoryName || ""} enablePagination={true} pageSize={30} />
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  )
}
