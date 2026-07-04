"use client"

import { useState } from "react"
import { Scissors, Loader2 } from "lucide-react"

interface GenerateButtonProps {
  onClick: () => Promise<void> | void
  disabled?: boolean
  label?: string
}

export default function GenerateButton({
  onClick,
  disabled = false,
  label = "Generate Klip",
}: GenerateButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading || disabled) return
    setLoading(true)
    try {
      await onClick()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative group inline-flex items-center gap-2.5
        px-6 py-3 rounded-xl font-semibold text-sm text-white
        bg-purple-600
        border border-purple-500
        transition-all duration-200
        ${!disabled && !loading
          ? "hover:bg-purple-500 hover:scale-[1.03] hover:shadow-lg hover:shadow-purple-500/40 active:scale-[0.97]"
          : "opacity-50 cursor-not-allowed"
        }
      `}
    >
      {/* Glow ring on hover */}
      {!disabled && !loading && (
        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-500/20 blur-md -z-10" />
      )}

      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Scissors size={16} className="transition-transform duration-200 group-hover:rotate-12" />
      )}

      {loading ? "Memproses..." : label}
    </button>
  )
}
