"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminStatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: {
    value: number
    isPositive: boolean
  }
  index?: number
}

export function AdminStatCard({ title, value, icon: Icon, change, index = 0 }: AdminStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="p-6 rounded-2xl bg-card border border-border"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        {change && (
          <span
            className={cn(
              "text-sm font-medium px-2 py-1 rounded-full",
              change.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500",
            )}
          >
            {change.isPositive ? "+" : ""}
            {change.value}%
          </span>
        )}
      </div>

      <h3 className="text-3xl font-bold mb-1">{typeof value === "number" ? value.toLocaleString() : value}</h3>
      <p className="text-muted-foreground text-sm">{title}</p>
    </motion.div>
  )
}
