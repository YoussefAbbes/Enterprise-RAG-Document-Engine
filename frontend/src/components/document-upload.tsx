"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { cn, API_URL } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface UploadResult {
  document_id: string
  filename: string
  status: string
  page_count: number
  chunk_count: number
  vector_count: number
  message: string
}

interface DocumentUploadProps {
  onUploadComplete?: (result: UploadResult) => void
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [result, setResult] = useState<UploadResult | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("error")
      setMessage("Only PDF files are supported")
      return
    }

    setUploading(true)
    setStatus("uploading")
    setProgress(10)
    setMessage(`Uploading ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      setProgress(30)
      setStatus("processing")
      setMessage("Processing document... This may take a moment.")

      const response = await fetch(`${API_URL}/api/v1/documents/upload-and-process`, {
        method: "POST",
        body: formData,
      })

      setProgress(90)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Upload failed")
      }

      const data: UploadResult = await response.json()

      setProgress(100)
      setStatus("success")
      setResult(data)
      setMessage(data.message)

      if (onUploadComplete) {
        onUploadComplete(data)
      }
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  const resetUpload = () => {
    setStatus("idle")
    setProgress(0)
    setMessage("")
    setResult(null)
  }

  return (
    <Card className="w-full shadow-xl border-2">
      <CardContent className="p-8">
        {status === "success" && result ? (
          <div className="text-center space-y-6 animate-scaleIn">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                <CheckCircle className="h-20 w-20 text-green-500 relative z-10 drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Upload Complete!</h3>
              <p className="text-sm text-muted-foreground font-medium">{result.filename}</p>
            </div>
            <div className="grid grid-cols-3 gap-6 py-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border-2 border-blue-200 shadow-lg">
                <p className="text-3xl font-bold text-blue-600 mb-1">{result.page_count}</p>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Pages</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border-2 border-purple-200 shadow-lg">
                <p className="text-3xl font-bold text-purple-600 mb-1">{result.chunk_count}</p>
                <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Chunks</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border-2 border-green-200 shadow-lg">
                <p className="text-3xl font-bold text-green-600 mb-1">{result.vector_count}</p>
                <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Vectors</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">{message}</p>
            <Button onClick={resetUpload} variant="outline" className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              <Upload className="h-4 w-4 mr-2" />
              Upload Another Document
            </Button>
          </div>
        ) : status === "error" ? (
          <div className="text-center space-y-6 animate-scaleIn">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                <XCircle className="h-20 w-20 text-red-500 relative z-10 drop-shadow-lg" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-700 mb-2">Upload Failed</h3>
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">{message}</p>
            </div>
            <Button onClick={resetUpload} variant="outline" className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
              Try Again
            </Button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              "border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
              isDragActive
                ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 scale-105 shadow-xl"
                : "border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/5",
              uploading && "pointer-events-none opacity-60"
            )}
          >
            <input {...getInputProps()} />

            {uploading ? (
              <div className="space-y-6 animate-scaleIn">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin relative z-10" />
                </div>
                <div>
                  <p className="text-base font-semibold mb-3">{message}</p>
                  <Progress value={progress} className="mt-2 h-3 shadow-inner" />
                  <p className="text-xs text-muted-foreground mt-2 font-medium">{progress}% complete</p>
                </div>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <div className="flex justify-center mb-6">
                  <div className={cn(
                    "p-6 rounded-2xl transition-all duration-300",
                    isDragActive
                      ? "bg-gradient-to-br from-primary to-primary/70 shadow-xl shadow-primary/30 scale-110"
                      : "bg-gradient-to-br from-muted to-muted/50 shadow-lg"
                  )}>
                    {isDragActive ? (
                      <FileText className="h-12 w-12 text-white" />
                    ) : (
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xl font-bold">
                    {isDragActive ? "Drop your PDF here!" : "Drag & drop a PDF file"}
                  </p>
                  <p className="text-base text-muted-foreground font-medium">
                    or click to browse your files
                  </p>
                  <div className="pt-3 border-t border-dashed border-muted-foreground/30 mt-4">
                    <p className="text-xs text-muted-foreground font-medium">
                      Supported format: <span className="text-foreground font-semibold">PDF</span>
                    </p>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      Maximum file size: <span className="text-foreground font-semibold">100MB</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
