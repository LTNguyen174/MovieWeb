"use client"
import { useState, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { categoriesAPI, type Category } from "@/lib/api"

interface CategorySelectProps {
  categories?: Category[]
  selectedCategory?: number | null
  onSelect?: (categoryId: number | null) => void
}

export function CategorySelect({ categories: propCategories, selectedCategory, onSelect }: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>(propCategories || [])
  const [loading, setLoading] = useState(!propCategories)

  useEffect(() => {
    // Nếu có categories từ props, không cần fetch
    if (propCategories) {
      setCategories(propCategories)
      return
    }

    // Fetch categories từ API
    async function fetchCategories() {
      try {
        setLoading(true)
        const data = await categoriesAPI.getCategories()
        setCategories(data)
      } catch (err) {
        console.error("Failed to fetch categories:", err)
        // Fallback to default categories nếu lỗi
        setCategories([
          { id: 1, name: "Action" },
          { id: 2, name: "Drama" },
          { id: 3, name: "Comedy" },
          { id: 4, name: "Sci-Fi" },
          { id: 5, name: "Horror" },
          { id: 6, name: "Romance" },
          { id: 7, name: "Thriller" },
          { id: 8, name: "Animation" },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [propCategories])

  // Đảm bảo displayCategories luôn là array
  const displayCategories = Array.isArray(categories) ? categories : []
  const selectedCategoryName = displayCategories.find((c) => c.id === selectedCategory)?.name || "All Categories"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 min-w-[160px] justify-between bg-transparent">
          {selectedCategoryName}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuItem onClick={() => onSelect?.(null)} className="flex items-center justify-between">
          All Categories
          {selectedCategory === null && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        {displayCategories.map((category) => (
          <DropdownMenuItem
            key={category.id}
            onClick={() => onSelect?.(category.id)}
            className="flex items-center justify-between"
          >
            {category.name}
            {selectedCategory === category.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface YearSelectProps {
  selectedYear?: number | null
  onSelect?: (year: number | null) => void
}

export function YearSelect({ selectedYear, onSelect }: YearSelectProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 min-w-[120px] justify-between bg-transparent">
          {selectedYear || "All Years"}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[150px] max-h-[300px] overflow-auto">
        <DropdownMenuItem onClick={() => onSelect?.(null)} className="flex items-center justify-between">
          All Years
          {selectedYear === null && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        {years.map((year) => (
          <DropdownMenuItem key={year} onClick={() => onSelect?.(year)} className="flex items-center justify-between">
            {year}
            {selectedYear === year && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
