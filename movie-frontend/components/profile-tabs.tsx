"use client"

import { motion } from "framer-motion"
import { Heart, MessageSquare, Key } from "lucide-react"
import { cn } from "@/lib/utils"

interface Tab {
  id: string
  label: string
  icon: typeof Heart
}

interface ProfileTabsProps {
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabs: Tab[] = [
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "comments", label: "My Comments", icon: MessageSquare },
    { id: "password", label: "Change Password", icon: Key },
  ]

  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-4 mb-8">
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors",
            activeTab === tab.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80",
          )}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </motion.button>
      ))}
    </div>
  )
}
