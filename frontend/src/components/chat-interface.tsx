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
    <Card className="flex flex-col h-[700px] shadow-2xl border-2 overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-lg">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-2 shadow-lg shadow-blue-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold gradient-text">Chat with Your Documents</span>
          </div>
          {documentIds && documentIds.length > 0 && (
            <span className="text-xs font-semibold text-muted-foreground bg-white px-3 py-1.5 rounded-full border shadow-sm">
              {documentIds.length} doc{documentIds.length > 1 ? "s" : ""} loaded
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fadeIn">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-6 shadow-xl border-2 border-white relative z-10">
                  <FileText className="h-14 w-14 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 gradient-text">Ready to chat!</h3>
              <p className="text-base text-muted-foreground max-w-md leading-relaxed mb-8">
                Upload a document first, then ask questions about it.
                The AI will find relevant information and provide structured answers.
              </p>
              <div className="w-full max-w-md space-y-3">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-3">Try asking:</p>
                <button
                  onClick={() => setInput("What are the main topics in this document?")}
                  className="w-full text-sm text-left px-5 py-4 rounded-xl bg-white hover:bg-primary/5 border-2 border-transparent hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-primary">❯</span>
                    <span className="group-hover:text-primary transition-colors duration-300">"What are the main topics in this document?"</span>
                  </span>
                </button>
                <button
                  onClick={() => setInput("Summarize the key points")}
                  className="w-full text-sm text-left px-5 py-4 rounded-xl bg-white hover:bg-primary/5 border-2 border-transparent hover:border-primary/20 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-primary">❯</span>
                    <span className="group-hover:text-primary transition-colors duration-300">"Summarize the key points"</span>
                  </span>
                </button>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4 animate-slideIn",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-white">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl",
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white px-5 py-4 border-2 border-blue-500"
                      : "bg-white border-2 border-slate-200 px-5 py-4"
                  )}
                >
                  {message.role === "user" ? (
                    <p className="text-sm leading-relaxed font-medium">{message.content}</p>
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
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 font-semibold">
                        <Info className="h-3.5 w-3.5" />
                        <span>{message.sources.length} sources found</span>
                        {message.model && (
                          <>
                            <span>•</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded">Model: {message.model}</span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.slice(0, 3).map((source, i) => (
                          <span
                            key={i}
                            className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium border border-blue-200 shadow-sm"
                          >
                            Source {i + 1}: {source.relevance}%
                          </span>
                        ))}
                        {message.sources.length > 3 && (
                          <span className="text-xs text-muted-foreground bg-slate-100 px-3 py-1.5 rounded-lg font-medium border">
                            +{message.sources.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/30 border-2 border-white">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-4 animate-fadeIn">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-white">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-lg max-w-[85%]">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium">Searching documents and generating response...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-gradient-to-r from-slate-50 to-blue-50/30 p-5">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1 px-5 py-4 border-2 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 shadow-sm font-medium placeholder:text-muted-foreground/60"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 -translate-x-full" />
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin relative z-10" />
              ) : (
                <Send className="h-5 w-5 relative z-10" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3 text-center font-medium">
            Responses are generated from your uploaded documents using AI
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
