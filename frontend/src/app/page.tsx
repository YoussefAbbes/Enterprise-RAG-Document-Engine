"use client"

import { useState, useEffect } from "react"
import { FileText, MessageSquare, Upload, Activity, Zap, Database, Brain } from "lucide-react"
import { DocumentUpload } from "@/components/document-upload"
import { ChatInterface } from "@/components/chat-interface"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { API_URL } from "@/lib/utils"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary to-primary/70 rounded-xl p-2.5 shadow-lg shadow-primary/20">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                  RAG Document Engine
                </h1>
                <p className="text-xs text-muted-foreground">Intelligent document Q&A</p>
              </div>
            </div>

            {/* Health Status */}
            <div className="flex items-center gap-3">
              {error ? (
                <span className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  Disconnected
                </span>
              ) : health ? (
                <span className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {health.status}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Connecting...</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <Card className="border-red-200 bg-red-50/50 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-red-700 font-medium text-lg mb-2">{error}</p>
              <p className="text-sm text-red-600">
                Run: <code className="bg-red-100 px-2 py-1 rounded font-mono">docker compose up -d</code>
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Feature highlights */}
            {documents.length === 0 && activeTab === "upload" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl p-4 border">
                  <div className="bg-blue-100 rounded-lg p-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Upload PDFs</p>
                    <p className="text-xs text-muted-foreground">Drag & drop any PDF document</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl p-4 border">
                  <div className="bg-purple-100 rounded-lg p-2">
                    <Database className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Vector Search</p>
                    <p className="text-xs text-muted-foreground">AI-powered semantic search</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-xl p-4 border">
                  <div className="bg-green-100 rounded-lg p-2">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Instant Answers</p>
                    <p className="text-xs text-muted-foreground">Get structured responses</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={activeTab === "upload" ? "default" : "outline"}
                onClick={() => setActiveTab("upload")}
                className="gap-2 rounded-xl"
                size="lg"
              >
                <Upload className="h-4 w-4" />
                Upload Documents
              </Button>
              <Button
                variant={activeTab === "chat" ? "default" : "outline"}
                onClick={() => setActiveTab("chat")}
                className="gap-2 rounded-xl"
                size="lg"
              >
                <MessageSquare className="h-4 w-4" />
                Chat
                {documents.length > 0 && (
                  <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
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
                <Card className="shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Documents ({documents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {documents.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No documents yet
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload a PDF to get started
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div
                            key={doc.document_id}
                            className="p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10 card-hover"
                          >
                            <p className="font-medium text-sm truncate flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              {doc.filename}
                            </p>
                            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">{doc.page_count}</span> pages
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">{doc.chunk_count}</span> chunks
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="font-semibold text-foreground">{doc.vector_count}</span> vectors
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
                  <Card className="shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">MinIO Storage</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          health.services.minio.includes("healthy")
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {health.services.minio.includes("healthy") ? "Online" : "Error"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Qdrant Vectors</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          health.services.qdrant.includes("healthy")
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {health.services.qdrant.includes("healthy")
                            ? health.services.qdrant.match(/\d+/)?.[0] + " vectors" || "Online"
                            : "Error"}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">API Version</span>
                          <span className="font-mono bg-muted px-2 py-0.5 rounded">{health.version}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tips */}
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Pro Tips
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li>• Upload technical docs for best results</li>
                      <li>• Ask specific questions for precise answers</li>
                      <li>• Tables and lists are formatted automatically</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground bg-white/50">
        <p>Enterprise RAG Document Engine • Built with Next.js, FastAPI & Qdrant</p>
      </footer>
    </div>
  )
}
