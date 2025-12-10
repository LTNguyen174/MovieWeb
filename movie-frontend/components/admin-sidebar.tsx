"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, Film, Tag, User, Globe, Users, MessageSquare, LogOut 
} from "lucide-react"

interface AdminSidebarProps {
  currentPage?: string
}

export function AdminSidebar({ currentPage }: AdminSidebarProps) {
  const getButtonVariant = (page: string) => {
    return currentPage === page ? "secondary" : "ghost"
  }

  const getButtonClass = (page: string) => {
    const baseClass = "w-full justify-start gap-3"
    return currentPage === page 
      ? `${baseClass} text-foreground` 
      : `${baseClass} text-muted-foreground`
  }

  return (
    <aside className="w-64 bg-card border-r border-border p-6 hidden lg:block">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Film className="w-8 h-8 text-primary" />
        <span className="text-xl font-bold">CineStream</span>
      </Link>

      <nav className="space-y-2">
        <Link href="/admin">
          <Button variant={getButtonVariant("dashboard")} className={getButtonClass("dashboard")}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Button>
        </Link>
        <Link href="/admin/movies">
          <Button variant={getButtonVariant("movies")} className={getButtonClass("movies")}>
            <Film className="w-5 h-5" />
            Movies
          </Button>
        </Link>
        <Link href="/admin/categories">
          <Button variant={getButtonVariant("categories")} className={getButtonClass("categories")}>
            <Tag className="w-5 h-5" />
            Categories
          </Button>
        </Link>
        <Link href="/admin/actors">
          <Button variant={getButtonVariant("actors")} className={getButtonClass("actors")}>
            <User className="w-5 h-5" />
            Actors
          </Button>
        </Link>
        <Link href="/admin/countries">
          <Button variant={getButtonVariant("countries")} className={getButtonClass("countries")}>
            <Globe className="w-5 h-5" />
            Countries
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button variant={getButtonVariant("users")} className={getButtonClass("users")}>
            <Users className="w-5 h-5" />
            Users
          </Button>
        </Link>
        <Link href="/admin/comments">
          <Button variant={getButtonVariant("comments")} className={getButtonClass("comments")}>
            <MessageSquare className="w-5 h-5" />
            Comments
          </Button>
        </Link>
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
