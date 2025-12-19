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

    // Fetch categories từ API giống trang categories
    async function fetchCategories() {
      try {
        setLoading(true)
        const cats = await categoriesAPI.getCategories()
        const catList: Array<{ id: number; name: string }> = Array.isArray(cats)
          ? cats
          : (cats && typeof cats === "object" && Array.isArray((cats as any).results)
              ? (cats as any).results
              : [])
        
        if (catList.length > 0) {
          setCategories(catList)
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err)
        // Fallback danh sách cơ bản
        setCategories([
          { id: 1, name: "Hành động" },
          { id: 2, name: "Phiêu lưu" },
          { id: 3, name: "Hoạt hình" },
          { id: 4, name: "Hài" },
          { id: 5, name: "Tội phạm" },
          { id: 6, name: "Tài liệu" },
          { id: 7, name: "Chính kịch" },
          { id: 8, name: "Gia đình" },
          { id: 9, name: "Giả tưởng" },
          { id: 10, name: "Lịch sử" },
          { id: 11, name: "Kinh dị" },
          { id: 12, name: "Âm nhạc" },
          { id: 13, name: "Bí ẩn" },
          { id: 14, name: "Lãng mạn" },
          { id: 15, name: "Khoa học viễn tưởng" },
          { id: 16, name: "Phim truyền hình" },
          { id: 17, name: "Giật gân" },
          { id: 18, name: "Chiến tranh" },
          { id: 19, name: "Cổ điển" },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [propCategories])

  // Đảm bảo displayCategories luôn là array
  const displayCategories = Array.isArray(categories) ? categories : []
  const selectedCategoryName = displayCategories.find((c) => c.id === selectedCategory)?.name || "Tất cả"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 min-w-[160px] justify-between bg-transparent">
          {selectedCategoryName}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-auto">
        <DropdownMenuItem onClick={() => onSelect?.(null)} className="flex items-center justify-between">
          Tất cả
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
