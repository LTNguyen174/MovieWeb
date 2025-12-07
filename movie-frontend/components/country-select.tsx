"use client"
import { useState, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Country {
  id: number
  name: string
  code: string
}

interface CountrySelectProps {
  selectedCountry?: string | null
  onSelect?: (country: string | null) => void
}

export function CountrySelect({ selectedCountry, onSelect }: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Danh sách các quốc gia phổ biến
    const popularCountries: Country[] = [
      { id: 1, name: "United States", code: "US" },
      { id: 2, name: "United Kingdom", code: "UK" },
      { id: 3, name: "France", code: "FR" },
      { id: 4, name: "Germany", code: "DE" },
      { id: 5, name: "Italy", code: "IT" },
      { id: 6, name: "Spain", code: "ES" },
      { id: 7, name: "Japan", code: "JP" },
      { id: 8, name: "South Korea", code: "KR" },
      { id: 9, name: "China", code: "CN" },
      { id: 10, name: "India", code: "IN" },
      { id: 11, name: "Canada", code: "CA" },
      { id: 12, name: "Australia", code: "AU" },
      { id: 13, name: "Brazil", code: "BR" },
      { id: 14, name: "Mexico", code: "MX" },
      { id: 15, name: "Russia", code: "RU" },
    ]
    
    setCountries(popularCountries)
    setLoading(false)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="rounded-full gap-2 min-w-[140px] justify-between bg-transparent">
          {selectedCountry || "All Countries"}
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px] max-h-[300px] overflow-auto">
        <DropdownMenuItem onClick={() => onSelect?.(null)} className="flex items-center justify-between">
          All Countries
          {selectedCountry === null && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        {countries.map((country) => (
          <DropdownMenuItem key={country.id} onClick={() => onSelect?.(country.name)} className="flex items-center justify-between">
            {country.name}
            {selectedCountry === country.name && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
