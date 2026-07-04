"use client"

import { useState } from "react"
import JSZip from "jszip"
import ClipCard, { type ClipData } from "./ClipCard"
import ProcessingCard from "@/components/ui/ProcessingCard"
import { Download } from "lucide-react"

interface ClipGridProps {
  clips: ClipData[]
  projectId: string
  status: "QUEUED" | "PROCESSING" | "DONE" | "FAILED"
  progress: number
  title?: string
  onProcessingComplete?: () => void
}

export default function ClipGrid({
  clips,
  projectId,
  status,
  progress,
  title,
  onProcessingComplete,
}: ClipGridProps) {
  const isProcessing = status === "QUEUED" || status === "PROCESSING"
  const [zipping, setZipping] = useState(false)

  const clipsWithUrl = clips.filter((c) => c.storageUrl)
  const hasReadyClips = status === "DONE" && clipsWithUrl.length > 0

  async function handleDownloadAllZip() {
    if (clipsWithUrl.length === 0) return
    setZipping(true)
    try {
      const zip = new JSZip()
      let completed = 0

      // Fetch semua klip paralel
      const results = await Promise.allSettled(
        clipsWithUrl.map(async (clip) => {
          const res = await fetch(clip.storageUrl!)
          const blob = await res.blob()
          const score = clip.viralityScore ?? 0
          const name = `clipai-${clip.id}-score${score}.mp4`
          zip.file(name, blob)
          completed++
        })
      )

      const failed = results.filter((r) => r.status === "rejected").length
      if (completed === 0) return

      const blob = await zip.generateAsync({ type: "blob" })
      const a = document.createElement("a")
      const slug = (title || "clipai").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)
      a.href = URL.createObjectURL(blob)
      a.download = `${slug}_${clipsWithUrl.length}clip.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      // silent
    } finally {
      setZipping(false)
    }
  }

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-8 py-6 w-full max-w-sm">
          <ProcessingCard
            projectId={projectId}
            initialProgress={progress}
            initialStatus={status}
            title={title}
            onComplete={onProcessingComplete}
          />
        </div>
      </div>
    )
  }

  if (status === "FAILED") {
    return (
      <div className="text-center py-16 text-zinc-500 text-sm">
        <p className="text-red-400 font-medium">Gagal memproses video</p>
        <p className="mt-1">Coba lagi dengan URL yang berbeda</p>
      </div>
    )
  }

  if (clips.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 text-sm">
        Belum ada klip. Submit URL YouTube dulu!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Download All button */}
      {hasReadyClips && (
        <div className="flex justify-end">
          <button
            onClick={handleDownloadAllZip}
            disabled={zipping}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg
              bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50
              text-white disabled:text-white/60 transition-all"
          >
            {zipping ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Mengompres...
              </>
            ) : (
              <>
                <Download size={15} />
                Download All ({clipsWithUrl.length} klip)
              </>
            )}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {clips.map((clip, i) => (
          <div
            key={clip.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <ClipCard clip={clip} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}
