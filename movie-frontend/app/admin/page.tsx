"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Users, Film, MessageSquare, Eye, Search, LayoutDashboard, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminStatCard } from "@/components/admin-stat-card"
import { AdminTable } from "@/components/admin-table"
import Link from "next/link"

export default function AdminDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const stats = [
    { title: "Total Users", value: 12847, icon: Users, change: { value: 12, isPositive: true } },
    { title: "Total Movies", value: 5234, icon: Film, change: { value: 8, isPositive: true } },
    { title: "Total Comments", value: 34521, icon: MessageSquare, change: { value: 15, isPositive: true } },
    { title: "Total Views", value: 1234567, icon: Eye, change: { value: 23, isPositive: true } },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    // Simulate API call
    setTimeout(() => {
      setSearchResults([
        { tmdb_id: 101, title: "The Terminator", poster_path: "/poster1.jpg", release_date: "1984-10-26" },
        { tmdb_id: 102, title: "Terminator 2", poster_path: "/poster2.jpg", release_date: "1991-07-03" },
      ])
      setIsSearching(false)
    }, 1000)
  }

  const handleImport = (tmdbId: number) => {
    console.log("Importing movie:", tmdbId)
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Film className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold">CineStream</span>
        </Link>

        <nav className="space-y-2">
          <Button variant="secondary" className="w-full justify-start gap-3">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <Film className="w-5 h-5" />
            Movies
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <Users className="w-5 h-5" />
            Users
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <MessageSquare className="w-5 h-5" />
            Comments
          </Button>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your platform.</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <AdminStatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              change={stat.change}
              index={index}
            />
          ))}
        </div>

        {/* TMDB Search Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-6"
        >
          <h2 className="text-xl font-bold mb-6">Import Movies from TMDB</h2>

          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TMDB for movies..."
                className="pl-10 h-12 rounded-xl"
              />
            </div>
            <Button type="submit" className="h-12 px-8 rounded-xl" disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>

          {/* Search Results */}
          {(searchResults.length > 0 || isSearching) && (
            <AdminTable movies={searchResults} onImport={handleImport} isLoading={isSearching} />
          )}
        </motion.section>
      </main>
    </div>
  )
}
