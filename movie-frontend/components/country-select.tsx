"use client"
import { useState, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { countriesAPI } from "@/lib/api"

interface Country {
  id: number
  name: string
}

interface CountrySelectProps {
  selectedCountry?: string | null
  onSelect?: (country: string | null) => void
}

export function CountrySelect({ selectedCountry, onSelect }: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        console.log('DEBUG: Starting to fetch countries...')
        const countries = await countriesAPI.getCountries()
        console.log('DEBUG: Fetched countries:', countries)
        console.log('DEBUG: Number of countries:', countries.length)
        setCountries(countries)
      } catch (error) {
        console.error('Error fetching countries:', error)
        console.log('DEBUG: Using fallback countries list')
        // Fallback to hardcoded list if API fails
        setCountries([
          { id: 1, name: "United States of America" },
          { id: 2, name: "India" },
          { id: 3, name: "Mexico" },
          { id: 4, name: "Japan" },
          { id: 5, name: "South Korea" },
          { id: 90, name: "Việt Nam" }
        ])
      } finally {
        setLoading(false)
        console.log('DEBUG: Loading set to false, countries length:', countries.length)
      }
    }

    fetchCountries()
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
