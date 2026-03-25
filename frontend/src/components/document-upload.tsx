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
    <Card className="w-full">
      <CardContent className="p-6">
        {status === "success" && result ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-700">Upload Complete!</h3>
              <p className="text-sm text-muted-foreground mt-1">{result.filename}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center py-4">
              <div>
                <p className="text-2xl font-bold text-primary">{result.page_count}</p>
                <p className="text-xs text-muted-foreground">Pages</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{result.chunk_count}</p>
                <p className="text-xs text-muted-foreground">Chunks</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{result.vector_count}</p>
                <p className="text-xs text-muted-foreground">Vectors</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button onClick={resetUpload} variant="outline">
              Upload Another Document
            </Button>
          </div>
        ) : status === "error" ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-700">Upload Failed</h3>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
            <Button onClick={resetUpload} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50",
              uploading && "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} />

            {uploading ? (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                <div>
                  <p className="text-sm font-medium">{message}</p>
                  <Progress value={progress} className="mt-2 h-2" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  {isDragActive ? (
                    <FileText className="h-12 w-12 text-primary" />
                  ) : (
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isDragActive ? "Drop your PDF here" : "Drag & drop a PDF file"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse your files
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 100MB
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
