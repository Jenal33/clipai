"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"

interface ProcessingCardProps {
  projectId: string
  initialProgress?: number
  initialStatus?: "QUEUED" | "PROCESSING" | "DONE" | "FAILED"
  title?: string
  onComplete?: () => void
}

const STATUS_MESSAGES = [
  "Mengunduh video...",
  "Transkripsi audio...",
  "Analisis konten AI...",
  "Deteksi momen viral...",
  "Potong klip...",
  "Upload ke cloud...",
  "Hampir selesai...",
]

export default function ProcessingCard({
  projectId,
  initialProgress = 0,
  initialStatus = "QUEUED",
  title,
  onComplete,
}: ProcessingCardProps) {
  const [progress, setProgress] = useState(initialProgress)
  const [status, setStatus] = useState(initialStatus)
  const [msgIdx, setMsgIdx] = useState(0)

  // Rotate status messages while processing
  useEffect(() => {
    if (status !== "PROCESSING") return
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % STATUS_MESSAGES.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [status])

  // Poll project status from API
  useEffect(() => {
    if (status === "DONE" || status === "FAILED") return

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/clips/status?projectId=${projectId}`)
        if (!res.ok) return
        const data = await res.json()
        setProgress(data.progress ?? progress)
        setStatus(data.status)
        if (data.status === "DONE") {
          clearInterval(poll)
          onComplete?.()
        }
        if (data.status === "FAILED") clearInterval(poll)
      } catch { /* swallow */ }
    }, 2500)

    return () => clearInterval(poll)
  }, [projectId, status]) // eslint-disable-line react-hooks/exhaustive-deps

  // SVG ring params
  const R = 52
  const CIRCUMFERENCE = 2 * Math.PI * R
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE

  if (status === "DONE") {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <CheckCircle2 size={40} className="text-emerald-400" />
        <p className="text-emerald-400 font-medium text-sm">Selesai!</p>
      </div>
    )
  }

  if (status === "FAILED") {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <XCircle size={40} className="text-red-400" />
        <p className="text-red-400 font-medium text-sm">Gagal memproses</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6 px-4">
      {/* Glowing SVG ring */}
      <div className="relative">
        {/* Glow backdrop */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-30 bg-purple-500 transition-opacity duration-500"
          style={{ opacity: status === "PROCESSING" ? 0.35 : 0.1 }}
        />

        <svg width="128" height="128" className="-rotate-90">
          {/* Track */}
          <circle
            cx="64" cy="64" r={R}
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="64" cy="64" r={R}
            fill="none"
            stroke="url(#progressGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
            style={{
              filter: "drop-shadow(0 0 6px rgba(168,85,247,0.8))",
            }}
          />
          <defs>
            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {status === "QUEUED" ? (
            <Clock size={22} className="text-zinc-500" />
          ) : (
            <>
              <span className="text-white text-xl font-bold leading-none">{progress}%</span>
              <Loader2 size={12} className="text-purple-400 animate-spin mt-1" />
            </>
          )}
        </div>
      </div>

      {/* Status text */}
      <div className="text-center space-y-1">
        {status === "QUEUED" ? (
          <p className="text-zinc-400 text-sm">Menunggu antrian...</p>
        ) : (
          <p className="text-zinc-300 text-sm font-medium transition-all duration-500">
            {STATUS_MESSAGES[msgIdx]}
          </p>
        )}
        {title && (
          <p className="text-zinc-600 text-xs truncate max-w-48">{title}</p>
        )}
      </div>

      {/* Segmented bar */}
      <div className="w-full max-w-48 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => {
          const segProgress = (i + 1) * (100 / 7)
          return (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                progress >= segProgress
                  ? "bg-purple-500"
                  : progress >= segProgress - 100 / 7
                  ? "bg-purple-500/40"
                  : "bg-zinc-700"
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
