"use client"

import { useState, useEffect, useRef } from "react"
import { X, Link, Facebook, MessageCircle, Send, Twitter, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

// Share platform configuration
interface SharePlatform {
  name: string
  icon: React.ReactNode
  color: string
  generateUrl: (url: string, title: string, description: string) => string
  action?: "popup" | "copy"
}

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  url?: string
  title?: string
  description?: string
  poster?: string
  timestamp?: number
}

export function ShareModal({ 
  isOpen, 
  onClose, 
  url, 
  title = "MovieWeb", 
  description = "Xem phim online chất lượng cao", 
  poster,
  timestamp 
}: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Generate share URL with optional timestamp
  const getShareUrl = () => {
    const baseUrl = url || window.location.href
    return timestamp ? `${baseUrl}?t=${timestamp}` : baseUrl
  }

  // Platform-specific share URL generators
  const sharePlatforms: SharePlatform[] = [
    {
      name: "Copy Link",
      icon: <Link className="w-5 h-5" />,
      color: "bg-gray-600 hover:bg-gray-700",
      generateUrl: (url) => url,
      action: "copy"
    },
    {
      name: "Facebook",
      icon: <Facebook className="w-5 h-5" />,
      color: "bg-blue-600 hover:bg-blue-700",
      generateUrl: (url, title) => 
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`
    },
    {
      name: "Telegram",
      icon: <Send className="w-5 h-5" />,
      color: "bg-blue-500 hover:bg-blue-600",
      generateUrl: (url, title) => 
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    },
    {
      name: "WhatsApp",
      icon: <MessageCircle className="w-5 h-5" />,
      color: "bg-green-600 hover:bg-green-700",
      generateUrl: (url, title) => 
        `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`
    },
    {
      name: "Twitter (X)",
      icon: <Twitter className="w-5 h-5" />,
      color: "bg-black hover:bg-gray-800",
      generateUrl: (url, title, description) => 
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} - ${description}`)}&url=${encodeURIComponent(url)}`
    },
    {
      name: "Discord",
      icon: <MessageSquare className="w-5 h-5" />,
      color: "bg-indigo-600 hover:bg-indigo-700",
      generateUrl: (url, title) => url,
      action: "copy"
    }
  ]

  // Copy to clipboard with visual feedback
  const copyToClipboard = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
      
      console.log(`Copied ${platform} link to clipboard`)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Handle share action
  const handleShare = (platform: SharePlatform) => {
    const shareUrl = getShareUrl()
    const generatedUrl = platform.generateUrl(shareUrl, title, description)

    if (platform.action === "copy") {
      copyToClipboard(generatedUrl, platform.name)
    } else {
      // Open in popup window for better UX
      const popup = window.open(
        generatedUrl,
        "share-popup",
        "width=600,height=400,scrollbars=yes,resizable=yes"
      )
      
      // Fallback if popup is blocked
      if (!popup) {
        window.location.href = generatedUrl
      }
    }
  }

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-lg border border-border"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="share-modal-title" className="text-xl font-semibold">
            Share this movie
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Close share modal"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Movie Poster and Info */}
          <div className="mb-6 flex gap-4">
            {poster && (
              <img 
                src={poster} 
                alt={title}
                className="w-32 h-44 object-cover rounded-lg shadow-md"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-xl mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
              <p className="text-xs text-muted-foreground mt-3 font-mono truncate">{getShareUrl()}</p>
              {timestamp && (
                <p className="text-xs text-muted-foreground mt-1">
                  Includes timestamp: {Math.floor(timestamp / 60)}:{(timestamp % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
          </div>

          {/* Share options grid */}
          <div className="grid grid-cols-2 gap-3">
            {sharePlatforms.map((platform) => (
              <Button
                key={platform.name}
                onClick={() => handleShare(platform)}
                className={`${platform.color} text-white flex items-center gap-2 justify-start h-12 px-4`}
                variant="default"
              >
                {platform.icon}
                <span className="text-sm font-medium">{platform.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 pt-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Toast notification for copied feedback */}
        {copied && (
          <div className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              <span className="text-sm font-medium">Link copied!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Custom hook for managing share modal state
export function useShareModal() {
  const [isOpen, setIsOpen] = useState(false)

  const openModal = () => setIsOpen(true)
  const closeModal = () => setIsOpen(false)

  return {
    isOpen,
    openModal,
    closeModal
  }
}
