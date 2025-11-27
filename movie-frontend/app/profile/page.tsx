"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Lock, Eye, EyeOff } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ProfileCard } from "@/components/profile-card"
import { ProfileTabs } from "@/components/profile-tabs"
import { MovieCard } from "@/components/movie-card"
import { CommentItem } from "@/components/comment-item"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("favorites")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Mock data
  const favorites = [
    {
      tmdb_id: 1,
      title: "Inception",
      poster: "/inception-movie-poster.png",
      release_year: 2010,
      categories: [{ id: 1, name: "Sci-Fi" }],
      average_rating: 4.7,
    },
    {
      tmdb_id: 2,
      title: "The Dark Knight",
      poster: "/dark-knight-poster.png",
      release_year: 2008,
      categories: [{ id: 1, name: "Action" }],
      average_rating: 4.8,
    },
    {
      tmdb_id: 3,
      title: "Interstellar",
      poster: "/interstellar-movie-poster.jpg",
      release_year: 2014,
      categories: [{ id: 1, name: "Sci-Fi" }],
      average_rating: 4.9,
    },
    {
      tmdb_id: 4,
      title: "Pulp Fiction",
      poster: "/pulp-fiction-poster.png",
      release_year: 1994,
      categories: [{ id: 1, name: "Crime" }],
      average_rating: 4.6,
    },
  ]

  const userComments = [
    {
      id: 1,
      username: "John Doe",
      content: "Amazing cinematography and soundtrack! A masterpiece.",
      created_at: "2025-01-15T10:30:00Z",
    },
    {
      id: 2,
      username: "John Doe",
      content: "One of my all-time favorites. Never gets old.",
      created_at: "2025-01-10T15:45:00Z",
    },
    { id: 3, username: "John Doe", content: "The plot twist was incredible!", created_at: "2025-01-05T09:20:00Z" },
  ]

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Profile Header */}
        <section className="mb-12">
          <ProfileCard />
        </section>

        {/* Tabs */}
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {activeTab === "favorites" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {favorites.map((movie, index) => (
                <MovieCard key={movie.tmdb_id} movie={movie} index={index} />
              ))}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-4 max-w-3xl">
              {userComments.map((comment, index) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  isOwner={true}
                  index={index}
                  onEdit={(id) => console.log("Edit comment:", id)}
                  onDelete={(id) => console.log("Delete comment:", id)}
                />
              ))}
            </div>
          )}

          {activeTab === "password" && (
            <div className="max-w-md">
              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="oldPassword"
                      type={showOldPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      className="pl-10 pr-10 h-12 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="pl-10 pr-10 h-12 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      className="pl-10 h-12 rounded-xl"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl">
                  Update Password
                </Button>
              </form>
            </div>
          )}
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}
