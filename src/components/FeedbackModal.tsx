'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Sparkles, ThumbsUp, ThumbsDown, Lightbulb, Skull } from 'lucide-react'

const moods = [
  { id: 'praise',    label: 'Pujian',   icon: ThumbsUp,   color: 'text-emerald-400' },
  { id: 'criticism', label: 'Kritikan',  icon: ThumbsDown, color: 'text-rose-400' },
  { id: 'suggestion',label: 'Saran',     icon: Lightbulb,  color: 'text-amber-400' },
  { id: 'rant',      label: 'Cacian',    icon: Skull,      color: 'text-purple-400' },
]

export default function FeedbackModal() {
  const [open, setOpen] = useState(false)
  const [mood, setMood] = useState('rant')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && textRef.current) textRef.current.focus()
  }, [open])

  const handleSubmit = async () => {
    if (!message.trim() || message.length < 3) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          mood,
          page: window.location.pathname,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Gagal')
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setMessage('')
    setMood('rant')
    setDone(false)
    setError('')
    setOpen(false)
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 group"
        title="Kirim feedback — cacian makian diterima"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) reset() }}
        >
          <div className="w-full max-w-md bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                {done ? 'Makasih Bos!' : 'Cacian & Saran'}
              </h3>
              <button onClick={reset} className="p-1 hover:bg-white/10 rounded-lg transition">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {done ? (
              <div className="text-center py-8 space-y-3">
                <div className="text-4xl">🔥</div>
                <p className="text-zinc-300 text-sm">Pesan lu udah nyampe ke Bang Je. Dijadiin bahan bakar nambah fitur.</p>
                <p className="text-zinc-500 text-xs">Makasih udah peduli ❤️</p>
                <button
                  onClick={reset}
                  className="mt-4 px-6 py-2 bg-zinc-800 rounded-xl text-sm text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <>
                {/* Mood Selector */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {moods.map((m) => {
                    const Icon = m.icon
                    const active = mood === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMood(m.id)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all duration-200 ${
                          active
                            ? `${m.color} border-current bg-white/5 shadow-[0_0_10px_rgba(168,85,247,0.2)]`
                            : 'text-zinc-500 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${active ? m.color : ''}`} />
                        <span className={`text-[10px] font-medium ${active ? 'text-white' : 'text-zinc-500'}`}>
                          {m.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Text Input */}
                <textarea
                  ref={textRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    mood === 'rant'    ? 'Hadeh, lu kela**an! Aplikasi lo error mulu...' :
                    mood === 'praise'  ? 'Keren banget bro, tambahin fitur...' :
                    mood === 'criticism' ? 'Ini mahal banget, tolong diperbaiki...' :
                    'Saran gue, mending tambahin...'
                  }
                  className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
                  maxLength={2000}
                />
                <p className="text-right text-[11px] text-zinc-600 mt-1">{message.length}/2000</p>

                {/* Error */}
                {error && (
                  <p className="text-rose-400 text-xs mb-2">{error}</p>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={sending || message.length < 3}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Kirim — Lu Wibu🎀
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
