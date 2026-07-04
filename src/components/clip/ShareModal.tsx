"use client"

import { useState, useEffect } from "react"
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Loader2,
} from "lucide-react"
import type { ClipData } from "./ClipCard"

// Simple SVG icons for platforms not in Lucide
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
)

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const PLATFORMS = [
  {
    key: "tiktok",
    label: "TikTok",
    Icon: TikTokIcon,
    color: "hover:bg-pink-500/20 hover:border-pink-500/40 hover:text-pink-300",
    note: "Upload langsung ke TikTok",
  },
  {
    key: "instagram",
    label: "Instagram",
    Icon: InstagramIcon,
    color: "hover:bg-purple-500/20 hover:border-purple-500/40 hover:text-purple-300",
    note: "Buka IG lalu upload manual",
  },
  {
    key: "youtube",
    label: "YouTube",
    Icon: YouTubeIcon,
    color: "hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300",
    note: "Buka YouTube Studio",
  },
  {
    key: "twitter",
    label: "X / Twitter",
    Icon: TwitterIcon,
    color: "hover:bg-zinc-600/40 hover:border-zinc-500/40 hover:text-white",
    note: "Share link + caption",
  },
]

interface ShareData {
  shareUrl: string
  platforms: Record<string, string>
  title: string
  viralityScore: number
  duration: number
}

interface Props {
  clip: ClipData
  onClose: () => void
}

export default function ShareModal({ clip, onClose }: Props) {
  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch(`/api/share/${clip.id}`)
      .then((r) => r.json())
      .then((d) => setShareData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clip.id])

  function copyLink() {
    if (!shareData) return
    navigator.clipboard.writeText(shareData.shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openPlatform(key: string) {
    if (!shareData?.platforms[key]) return
    window.open(shareData.platforms[key], "_blank", "noopener")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-zinc-900 border border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-purple-400" />
            <h2 className="text-white font-semibold text-sm">Share Klip</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition p-1 rounded-lg hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="text-purple-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Clip preview bar */}
              <div className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3">
                {clip.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={clip.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {shareData?.title || "ClipAI Clip"}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    {shareData?.duration}s · Skor {shareData?.viralityScore}/100
                  </p>
                </div>
              </div>

              {/* Platform buttons */}
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(({ key, label, Icon, color, note }) => (
                  <button
                    key={key}
                    onClick={() => openPlatform(key)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-700 text-zinc-400 bg-zinc-800/40 transition-all duration-200 text-left ${color}`}
                  >
                    <Icon />
                    <div>
                      <p className="text-sm font-medium leading-none mb-0.5">{label}</p>
                      <p className="text-[10px] opacity-60 leading-none">{note}</p>
                    </div>
                    <ExternalLink size={12} className="ml-auto opacity-40" />
                  </button>
                ))}
              </div>

              {/* Copy link */}
              <div className="flex items-center gap-2 bg-zinc-800/40 border border-zinc-700 rounded-xl px-4 py-3">
                <p className="text-zinc-400 text-xs truncate flex-1">{shareData?.shareUrl}</p>
                <button
                  onClick={copyLink}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-purple-600"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Disalin!" : "Copy"}
                </button>
              </div>

              <p className="text-zinc-600 text-[11px] text-center leading-relaxed">
                Download dulu klipnya, lalu upload ke IG/TikTok lewat HP untuk hasil terbaik.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
