"use client"

import { useState, useEffect } from "react"
import { FileText, MessageSquare, Upload, Activity, Zap, Database, Brain } from "lucide-react"
import { DocumentUpload } from "@/components/document-upload"
import { ChatInterface } from "@/components/chat-interface"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn, API_URL } from "@/lib/utils"

interface HealthStatus {
  status: string
  version: string
  services: {
    minio: string
    qdrant: string
  }
}

interface UploadedDocument {
  document_id: string
  filename: string
  page_count: number
  chunk_count: number
  vector_count: number
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "chat">("upload")
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [error, setError] = useState<string | null>(null)

  // Check health on load
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/health`)
        const data = await res.json()
        setHealth(data)
        setError(null)
      } catch (e) {
        setError("Cannot connect to backend. Make sure Docker is running.")
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleUploadComplete = (result: UploadedDocument) => {
    setDocuments((prev) => [...prev, result])
    // Auto-switch to chat after upload
    setTimeout(() => setActiveTab("chat"), 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 animate-slideInLeft">
              <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-xl p-2.5 shadow-lg shadow-blue-500/30 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 -translate-x-full" />
                <Brain className="h-6 w-6 text-white relative z-10" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">
                  Synapse
                </h1>
                <p className="text-xs text-muted-foreground font-medium">Powered by AI Vector Search</p>
              </div>
            </div>

            {/* Health Status */}
            <div className="flex items-center gap-3 animate-slideInRight">
              {error ? (
                <span className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-full shadow-sm border border-red-100">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Disconnected
                </span>
              ) : health ? (
                <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full shadow-sm border border-green-100">
                  <span className="w-2 h-2 bg-green-500 rounded-full shadow-sm shadow-green-500/50"></span>
                  {health.status}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" />
                  Connecting...
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {error ? (
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 shadow-xl animate-scaleIn">
            <CardContent className="p-8 text-center">
              <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-200/50">
                <Activity className="h-10 w-10 text-red-600" />
              </div>
              <p className="text-red-700 font-semibold text-xl mb-2">{error}</p>
              <p className="text-sm text-red-600 mb-4">
                Run: <code className="bg-red-200/50 px-3 py-1 rounded-lg font-mono font-semibold">docker compose up -d</code>
              </p>
              <p className="text-xs text-red-500">Make sure Docker Desktop is running and try refreshing the page.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Feature highlights */}
            {documents.length === 0 && activeTab === "upload" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fadeIn">
                <div className="group flex items-start gap-4 glass rounded-2xl p-5 border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow duration-300">
                    <Upload className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-base mb-1">Upload PDFs</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">Drag & drop any PDF document up to 100MB</p>
                  </div>
                </div>
                <div className="group flex items-start gap-4 glass rounded-2xl p-5 border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow duration-300">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-base mb-1">Vector Search</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">AI-powered semantic search across documents</p>
                  </div>
                </div>
                <div className="group flex items-start gap-4 glass rounded-2xl p-5 border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-shadow duration-300">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-base mb-1">Instant Answers</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">Get structured, formatted responses instantly</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-3 mb-6">
              <Button
                variant={activeTab === "upload" ? "default" : "outline"}
                onClick={() => setActiveTab("upload")}
                className={cn(
                  "gap-2 rounded-xl shadow-sm transition-all duration-300 relative overflow-hidden group",
                  activeTab === "upload" && "shadow-lg shadow-primary/20"
                )}
                size="lg"
              >
                {activeTab === "upload" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 -translate-x-full" />
                )}
                <Upload className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Upload Documents</span>
              </Button>
              <Button
                variant={activeTab === "chat" ? "default" : "outline"}
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "gap-2 rounded-xl shadow-sm transition-all duration-300 relative overflow-hidden group",
                  activeTab === "chat" && "shadow-lg shadow-primary/20"
                )}
                size="lg"
              >
                {activeTab === "chat" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 -translate-x-full" />
                )}
                <MessageSquare className="h-4 w-4 relative z-10" />
                <span className="relative z-10">Chat</span>
                {documents.length > 0 && (
                  <span className="ml-1 bg-white/30 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm relative z-10">
                    {documents.length}
                  </span>
                )}
              </Button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Panel */}
              <div className="lg:col-span-2">
                <div className="animate-fadeIn">
                  {activeTab === "upload" ? (
                    <DocumentUpload onUploadComplete={handleUploadComplete} />
                  ) : (
                    <ChatInterface
                      documentIds={documents.map((d) => d.document_id)}
                    />
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Documents List */}
                <Card className="shadow-xl border-2 overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documents ({documents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {documents.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="bg-gradient-to-br from-muted to-muted/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3 shadow-inner">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          No documents yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Upload a PDF to get started
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc, index) => (
                          <div
                            key={doc.document_id}
                            className="p-4 rounded-xl bg-gradient-to-br from-primary/5 via-primary/8 to-primary/10 border-2 border-primary/10 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <p className="font-semibold text-sm truncate flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                              <span className="group-hover:text-primary transition-colors duration-300">{doc.filename}</span>
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                                <span className="font-bold text-foreground">{doc.page_count}</span> pages
                              </span>
                              <span className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                                <span className="font-bold text-foreground">{doc.chunk_count}</span> chunks
                              </span>
                              <span className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                                <span className="font-bold text-foreground">{doc.vector_count}</span> vectors
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                {health && (
                  <Card className="shadow-xl border-2 overflow-hidden">
                    <CardHeader className="pb-3 bg-gradient-to-br from-green-50 to-emerald-50">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-600" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-background to-muted/30 border group hover:border-primary/20 transition-all duration-300">
                        <span className="text-sm font-medium text-muted-foreground">MinIO Storage</span>
                        <span className={cn(
                          "text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm transition-all duration-300",
                          health.services.minio.includes("healthy")
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-red-100 text-red-700 border border-red-200"
                        )}>
                          {health.services.minio.includes("healthy") ? "✓ Online" : "✗ Error"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-background to-muted/30 border group hover:border-primary/20 transition-all duration-300">
                        <span className="text-sm font-medium text-muted-foreground">Qdrant Vectors</span>
                        <span className={cn(
                          "text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm transition-all duration-300",
                          health.services.qdrant.includes("healthy")
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-red-100 text-red-700 border border-red-200"
                        )}>
                          {health.services.qdrant.includes("healthy")
                            ? health.services.qdrant.match(/\d+/)?.[0] + " vectors" || "✓ Online"
                            : "✗ Error"}
                        </span>
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex justify-between items-center text-xs p-2">
                          <span className="text-muted-foreground font-medium">API Version</span>
                          <span className="font-mono bg-primary/10 text-primary px-3 py-1 rounded-lg font-semibold">{health.version}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tips */}
                <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-primary/20 shadow-xl">
                  <CardContent className="p-5">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-primary">
                      <Zap className="h-4 w-4" />
                      Pro Tips
                    </h4>
                    <ul className="text-xs text-foreground/80 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Upload technical docs for best results</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Ask specific questions for precise answers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>Tables and lists are formatted automatically</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 text-center glass relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700">
            Synapse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Built with Next.js, FastAPI, Qdrant & OpenRouter • Powered by AI Vector Search
          </p>
        </div>
      </footer>
    </div>
  )
}
