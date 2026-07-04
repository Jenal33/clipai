"use client"

import { useState } from "react"
import { Sparkles, X, Loader2, RefreshCw } from "lucide-react"
import type { ClipData } from "./ClipCard"

interface Props {
  clip: ClipData
  onClose: () => void
}

interface Caption {
  type: string
  text: string
  platform: string
}

export default function CaptionModal({ clip, onClose }: Props) {
  const [captions, setCaptions] = useState<Caption[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)

  async function generate() {
    if (loading) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipId: clip.id,
          transcript: clip.transcript || "",
          title: clip.title || "",
          viralityScore: clip.viralityScore,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Gagal generate")
        return
      }
      setCaptions(data.captions)
    } catch {
      setError("Gagal konek server")
    } finally {
      setLoading(false)
    }
  }

  function copyCaption(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-zinc-900 border border-zinc-700 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h2 className="text-white font-semibold text-sm">Caption AI Viral</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition p-1 rounded-lg hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 overflow-y-auto flex-1">
          <p className="text-zinc-500 text-xs leading-relaxed">
            AI akan bikin 3 versi caption viral: pendek (TikTok), medium (IG), dan panjang (YouTube).
            Pakai 1 token per generate.
          </p>

          {!captions && !loading && !error && (
            <button
              onClick={generate}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-sm transition-all"
            >
              <Sparkles size={16} />
              Generate Caption AI
            </button>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={24} className="text-amber-400 animate-spin" />
              <p className="text-zinc-400 text-sm">AI nulis caption...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {captions && (
            <>
              {captions.map((cap, i) => (
                <div key={i} className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      {cap.type} · {cap.platform}
                    </span>
                    <button
                      onClick={() => copyCaption(cap.text, i)}
                      className="text-xs text-purple-400 hover:text-white transition font-medium"
                    >
                      {copiedIdx === i ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                    {cap.text}
                  </p>
                </div>
              ))}

              <button
                onClick={generate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 text-sm transition-all"
              >
                <RefreshCw size={14} />
                Generate Ulang
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
