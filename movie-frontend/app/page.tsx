"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroBanner } from "@/components/hero-banner"
import { SearchBar } from "@/components/search-bar"
import { CategorySelect, YearSelect } from "@/components/category-select"
import { MovieGrid } from "@/components/movie-grid"
import { RecommendationCarousel } from "@/components/recommendation-carousel"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <HeroBanner />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        {/* Search & Filters */}
        <section className="py-8">
          <SearchBar onSearch={setSearchQuery} placeholder="Search for movies, genres, actors..." />

          <div className="flex flex-wrap items-center gap-4 mt-6 justify-center">
            <CategorySelect selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
            <YearSelect selectedYear={selectedYear} onSelect={setSelectedYear} />
          </div>
        </section>

        {/* Featured Carousel - Chỉ hiển thị khi không search/filter */}
        {!searchQuery && !selectedCategory && !selectedYear && (
          <RecommendationCarousel title="Trending Now" />
        )}

        {/* Movie Grid */}
        <MovieGrid 
          title={
            searchQuery 
              ? `Kết quả tìm kiếm: "${searchQuery}"` 
              : selectedCategory || selectedYear 
                ? "Phim được lọc" 
                : "Popular Movies"
          }
          searchQuery={searchQuery || undefined}
          categoryId={selectedCategory}
          releaseYear={selectedYear}
        />

        {/* More Carousels - Chỉ hiển thị khi không search/filter */}
        {!searchQuery && !selectedCategory && !selectedYear && (
          <>
            <RecommendationCarousel title="New Releases" />
            <RecommendationCarousel title="Top Rated" />
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
