"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Loader2, FileText, Bot, User, Sparkles, Info } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn, API_URL } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Source {
  text: string
  document_id: string
  chunk_index: number
  relevance: number
}

interface ChatApiResponse {
  question: string
  answer: string
  sources: Source[]
  model: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
  model?: string
  timestamp: Date
}

interface ChatInterfaceProps {
  documentIds?: string[]
}

export function ChatInterface({ documentIds }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      // Use the new chat endpoint
      const response = await fetch(`${API_URL}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage.content,
          document_ids: documentIds,
          limit: 5,
        }),
      })

      if (!response.ok) {
        throw new Error("Chat request failed")
      }

      const data: ChatApiResponse = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        model: data.model,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `**Error:** ${error instanceof Error ? error.message : "Failed to get response"}. Make sure you have uploaded some documents first.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col h-[700px] shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Chat with Your Documents
          </div>
          {documentIds && documentIds.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {documentIds.length} doc{documentIds.length > 1 ? "s" : ""} loaded
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
              <div className="bg-primary/10 rounded-full p-4 mb-4">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <p className="text-lg font-medium mb-2">Ready to chat!</p>
              <p className="text-sm max-w-md">
                Upload a document first, then ask questions about it.
                The AI will find relevant information and provide structured answers.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-2 text-left w-full max-w-sm">
                <p className="text-xs text-muted-foreground mb-1">Try asking:</p>
                <button
                  onClick={() => setInput("What are the main topics in this document?")}
                  className="text-sm text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  "What are the main topics in this document?"
                </button>
                <button
                  onClick={() => setInput("Summarize the key points")}
                  className="text-sm text-left px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  "Summarize the key points"
                </button>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground px-4 py-3"
                      : "bg-card border px-4 py-3"
                  )}
                >
                  {message.role === "user" ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Style tables
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full border-collapse border border-border rounded-lg overflow-hidden">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-muted">{children}</thead>
                          ),
                          th: ({ children }) => (
                            <th className="border border-border px-3 py-2 text-left text-xs font-semibold">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-border px-3 py-2 text-sm">
                              {children}
                            </td>
                          ),
                          // Style code blocks
                          code: ({ className, children }) => {
                            const isBlock = className?.includes("language-")
                            return isBlock ? (
                              <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                                <code>{children}</code>
                              </pre>
                            ) : (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                                {children}
                              </code>
                            )
                          },
                          // Style blockquotes
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-2">
                              {children}
                            </blockquote>
                          ),
                          // Style headers
                          h1: ({ children }) => (
                            <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                          ),
                          // Style lists
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
                          ),
                          // Style paragraphs
                          p: ({ children }) => (
                            <p className="my-2 leading-relaxed">{children}</p>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Sources and model info */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Info className="h-3 w-3" />
                        <span>{message.sources.length} sources found</span>
                        {message.model && (
                          <>
                            <span>•</span>
                            <span>Model: {message.model}</span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.slice(0, 3).map((source, i) => (
                          <span
                            key={i}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                          >
                            Source {i + 1}: {source.relevance}%
                          </span>
                        ))}
                        {message.sources.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{message.sources.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-sm">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="bg-card border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching documents and generating response...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-muted/30 p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1 px-4 py-3 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 rounded-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Responses are generated from your uploaded documents
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
