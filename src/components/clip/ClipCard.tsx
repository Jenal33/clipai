"use client"

import { useState, type FC } from "react"
import { Download, Share2, Sparkles, ExternalLink, Scissors } from "lucide-react"
import CaptionModal from "./CaptionModal"
import ShareModal from "./ShareModal"

export interface ClipData {
  id: string
  title?: string | null
  startSec: number
  endSec: number
  viralityScore: number
  hook?: string | null
  reason?: string | null
  storageUrl?: string | null
  thumbnailUrl?: string | null
  transcript?: string | null
  tags: string[]
  platform: string[]
  subtitleUrl?: string | null
}

interface ClipCardProps {
  clip: ClipData
  index: number
}

export default function ClipCard({ clip, index }: ClipCardProps) {
  const dur = Math.round(clip.endSec - clip.startSec)
  const score = clip.viralityScore ?? 0

  // States for modals
  const [showCaption, setShowCaption] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleDownload() {
    if (!clip.storageUrl) return
    setDownloading(true)
    try {
      const res = await fetch(clip.storageUrl)
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `clipai-${clip.id}-score${score}.mp4`
      a.click()
      URL.revokeObjectURL(a.href)
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    } catch {
      // silent
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div className="group relative bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
        {/* Video / Thumbnail */}
        <div className="aspect-[9/16] bg-zinc-900 relative overflow-hidden">
          {clip.storageUrl ? (
            <video
              src={clip.storageUrl}
              className="w-full h-full object-cover"
              controls
              preload="metadata"
            />
          ) : clip.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clip.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 flex-col gap-2">
              <Scissors size={24} />
              <span className="text-xs">Potongan #{index + 1}</span>
            </div>
          )}

          {/* Overlay badge */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md border border-white/10 font-semibold uppercase tracking-wider">
              #{index + 1}
            </span>
            <span className="bg-black/60 backdrop-blur-md text-purple-300 text-[10px] px-2 py-1 rounded-md border border-purple-500/30 font-semibold">
              🔥 {score}
            </span>
          </div>

          {/* Duration */}
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md border border-white/10">
            {dur}s
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 space-y-2">
          {clip.reason && (
            <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2">
              {clip.reason}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDownload}
              disabled={!clip.storageUrl || downloading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {downloading ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : done ? (
                <>Done!</>
              ) : (
                <>
                  <Download size={13} />
                  Download
                </>
              )}
            </button>

            <button
              onClick={() => setShowShare(true)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Share"
            >
              <Share2 size={14} />
            </button>

            <button
              onClick={() => setShowCaption(true)}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              title="Buat Caption AI"
            >
              <Sparkles size={14} />
            </button>

            {clip.storageUrl && (
              <a
                href={clip.storageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                title="Buka"
              >
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCaption && (
        <CaptionModal clip={clip} onClose={() => setShowCaption(false)} />
      )}
      {showShare && (
        <ShareModal clip={clip} onClose={() => setShowShare(false)} />
      )}
    </>
  )
}

