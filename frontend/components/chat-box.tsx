"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "./ui/button"
import { moviesAPI } from "@/lib/api"
import { X, MessageSquare, Send } from "lucide-react"
import { useRouter } from "next/navigation"

// Use the same backend base URL as the rest of the frontend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

type ChatMessage = { role: "user" | "bot"; text: string; movies?: any[] }

export default function ChatBox() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  const send = async () => {
    const text = input.trim()
    if (!text) return

    const userMsg: ChatMessage = { role: "user", text }
    // Append locally first so user sees the message immediately
    setMessages((m) => [...m, userMsg])
    setInput("")
    setLoading(true)

      try {
      // send short conversation history (map roles to OpenAI roles)
      const historyToSend = [...messages, userMsg]
        .slice(-8)
        .map((h) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text }))

      const res = await fetch(`${API_BASE}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyToSend }),
      })
      const data = await res.json()
      const botMsg: ChatMessage = {
        role: "bot",
        text: data.reply || "Không có câu trả lời.",
        movies: data.movies || [],
      }
      setMessages((m) => [...m, botMsg])
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: "Lỗi kết nối tới server." }])
    } finally {
      setLoading(false)
    }
  }

  const openSuggestionsInSearch = (movies: any[]) => {
    if (!movies || movies.length === 0) return
    const ids = movies.map((m) => m.tmdb_id).join(",")
    router.push(`/search?suggested=${encodeURIComponent(ids)}`)
    setOpen(false)
  }

  return (
    <>
      {/* Floating button - fixed bottom-left */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
        title="Chat với AI"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat panel - fixed position */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-[450px] h-[500px] max-h-[200vh] bg-card border border-border rounded-xl shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <h3 className="font-semibold text-sm">AI Movie Assistant</h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-muted/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 p-3 overflow-y-auto space-y-3"
          >
            {messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                <p>👋 Xin chào! Hỏi mình về phim bạn muốn xem.</p>
                <p className="mt-2 text-xs">Ví dụ: "Phim hành động hay", "Phim gia đình", v.v.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    m.role === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>

                  {/* Movie suggestions */}
                  {m.role === "bot" && m.movies && m.movies.length > 0 && (
                    <div className="mt-3">
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {m.movies.map((mv) => (
                          <a
                            key={mv.tmdb_id}
                            href={`/movie/${mv.tmdb_id}`}
                            className="w-24 flex-shrink-0 group"
                          >
                            <div className="rounded overflow-hidden bg-background border border-border hover:border-primary transition-colors">
                              <img
                                src={mv.poster || "/placeholder.svg"}
                                alt={mv.title}
                                className="w-full h-28 object-cover group-hover:opacity-80 transition-opacity"
                              />
                              <div className="p-1.5">
                                <div className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                                  {mv.title}
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => m.movies && openSuggestionsInSearch(m.movies)}
                        className="w-full mt-2 text-xs"
                      >
                        Xem tất cả kết quả →
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg rounded-bl-none px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2 bg-card">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Hỏi về phim..."
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={loading}
            />
            <Button
              onClick={send}
              disabled={loading || !input.trim()}
              size="sm"
              className="px-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
