'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChevronDown } from 'lucide-react'
import ClipGrid from '@/components/clip/ClipGrid'
import type { ClipData } from '@/components/clip/ClipCard'

const clipSettings = [
  { count: 3,  duration: '60-90 dtk',  target: 'YouTube Shorts Storytelling' },
  { count: 5,  duration: '45-60 dtk',  target: 'Reels & Shorts' },
  { count: 10, duration: '30-45 dtk',  target: 'Mix semua platform' },
  { count: 15, duration: '15-30 dtk',  target: 'TikTok hook' },
]

const qualityOptions = [
  { value: '720p', label: '720p', subtitle: 'Cepat — hemat data & waktu render', icon: '🟢' },
  { value: '1080p', label: '1080p', subtitle: 'HD — kualitas tinggi, file lebih besar', icon: '🟡' },
  { value: '4k', label: '4K', subtitle: 'Maksimal — kualitas terbaik, butuh waktu lama', icon: '🔴' },
]

const qualityWarnings: Record<string, { title: string; body: string }> = {
  '1080p': { title: '⚠️ Risiko Kualitas HD', body: 'File lebih besar, render 2-3x lebih lama, dan butuh bandwidth lebih besar. Cocok untuk konten orisinal.' },
  '4k': { title: '🔴 Risiko Kualitas 4K', body: 'File sangat besar, render 5x lebih lama, dan butuh koneksi stabil. Hanya disarankan untuk video source resolusi 4K.' },
}

export default function ClipperPage() {
  const { data: session } = useSession()
  const userPlan = (session?.user as any)?.plan || 'FREE'
  const [url, setUrl] = useState('')
  const [clipCount, setClipCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [clips, setClips] = useState<ClipData[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED'>('DONE')
  const [progress, setProgress] = useState(0)
  const [projectTitle, setProjectTitle] = useState<string | undefined>()
  const [quality, setQuality] = useState('720p')
  const [qualityOpen, setQualityOpen] = useState(false)
  const qualityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (qualityRef.current && !qualityRef.current.contains(e.target as Node)) {
        setQualityOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Force reset untuk user FREE — kunci ke 3 klip & 720p
  useEffect(() => {
    if (userPlan === 'FREE') {
      if (clipCount > 3) setClipCount(3)
      if (quality !== '720p') setQuality('720p')
    }
  }, [userPlan, clipCount, quality])

  const handleGenerate = async () => {
    if (!url) return alert("Masukin link YouTube dulu, Bos!")
    setLoading(true)
    setError('')
    setClips([])
    setProgress(0)
    setStatus('QUEUED')
    setProjectTitle(undefined)

    try {
      const res = await fetch('/api/clips/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl: url,
          clipCount,
          quality,
          userId: session?.user?.id || 'guest',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal')
        setLoading(false)
        setStatus('FAILED')
        return
      }

      const pid = data.projectId || data.id
      setProjectId(pid)

      // Poll status sampai DONE/FAILED
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/clips/status?projectId=${pid}&t=${Date.now()}`, {
            cache: 'no-store',
          })
          if (!r.ok) return
          const d = await r.json()
          setProgress(d.progress ?? 0)
          setStatus(d.status)

          if (d.status === 'DONE') {
            clearInterval(poll)
            setLoading(false)
            if (d.clips?.length) {
              setClips(d.clips.map((c: any) => ({
                id: c.id,
                title: c.title,
                startSec: c.startSec,
                endSec: c.endSec,
                viralityScore: c.viralityScore,
                hook: c.hook,
                reason: c.reason,
                storageUrl: c.storageUrl,
                thumbnailUrl: c.thumbnailUrl,
                transcript: c.transcript,
                tags: c.tags || [],
                platform: c.platform || [],
                subtitleUrl: c.subtitleUrl,
              })))
            }
          } else if (d.status === 'FAILED') {
            clearInterval(poll)
            setLoading(false)
            setError(d.errorMessage || 'Gagal memproses video')
          }
        } catch {
          // retry
        }
      }, 3000)
    } catch {
      setError('Gagal konek server')
      setLoading(false)
      setStatus('FAILED')
    }
  }

  const activeSetting = clipSettings.find(s => s.count === clipCount)

  return (
    <div className="min-h-screen relative overflow-hidden bg-zinc-950 text-zinc-100 transition-colors duration-500 font-sans">
      {/* Background glow balls */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

      {/* KONTEN UTAMA */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-10 px-4">
        {/* Hero */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-center mb-4 tracking-tight">
          Ubah YouTube Jadi <span className="text-purple-400">Viral</span>
        </h1>
        <p className="text-zinc-400 text-center mb-10 max-w-lg">
          Paste URL YouTube, biar AI yang cari momen terbaik, potong otomatis, dan siapin buat TikTok/Shorts.
        </p>

        {/* ── GLASSMORPHISM FORM ── */}
        <div className="w-full max-w-2xl mx-auto space-y-6">
          {/* Input URL */}
          <input
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          {/* Selector UI */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-white/90">
              Pilih Target Klip & Durasi:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clipSettings.map((setting) => {
                const isLocked = userPlan === 'FREE' && setting.count > 3
                return (
                <div
                  key={setting.count}
                  onClick={() => !isLocked && setClipCount(setting.count)}
                  className={`cursor-pointer p-4 rounded-xl backdrop-blur-md border transition-all duration-300 ${
                    clipCount === setting.count
                      ? 'bg-purple-600/40 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : isLocked
                        ? 'bg-white/5 border-white/10 opacity-50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-2xl font-bold text-white">
                      {isLocked ? '🔒 ' : ''}{setting.count} <span className="text-sm font-normal text-gray-300">Klip</span>
                    </span>
                    <span className="text-sm font-medium text-purple-200 bg-purple-900/50 px-2 py-1 rounded-md">
                      {setting.duration}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {isLocked ? '🔒 Khusus PRO' : setting.target}
                  </p>
                </div>
                )
              })}
            </div>
          </div>

          {/* ── DROPDOWN KUALITAS (Netflix-style glassmorphism) ── */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/90">
              Kualitas Video:
            </label>
            <div className="relative" ref={qualityRef}>
              <button
                type="button"
                onClick={() => setQualityOpen((o) => !o)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {qualityOptions.find((q) => q.value === quality)?.icon}
                  </span>
                  <div className="text-left">
                    <span className="font-semibold">
                      {qualityOptions.find((q) => q.value === quality)?.label}
                    </span>
                    <p className="text-xs text-gray-400">
                      {qualityOptions.find((q) => q.value === quality)?.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                    qualityOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown menu */}
              {qualityOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-xl bg-zinc-900/95 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {qualityOptions.map((opt) => {
                    const isLocked = userPlan === 'FREE' && opt.value !== '720p'
                    return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (isLocked) return
                        setQuality(opt.value)
                        setQualityOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 p-4 text-left transition-all duration-200 ${
                        quality === opt.value
                          ? 'bg-purple-600/30 border-l-2 border-purple-400'
                          : isLocked
                            ? 'hover:bg-white/5 border-l-2 border-transparent opacity-50 cursor-not-allowed'
                            : 'hover:bg-white/5 border-l-2 border-transparent'
                      }`}
                    >
                      <span className="text-lg">{isLocked ? '🔒' : opt.icon}</span>
                      <div>
                        <span className={`font-semibold ${
                          quality === opt.value ? 'text-purple-300' : isLocked ? 'text-gray-500' : 'text-white'
                        }`}>
                          {isLocked ? `${opt.label} (Khusus PRO)` : opt.label}
                        </span>
                        <p className="text-xs text-gray-400">{isLocked ? '🔒 Upgrade ke PRO untuk akses' : opt.subtitle}</p>
                      </div>
                    </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Inline warning — muncul pas milih 1080p / 4K */}
            {qualityWarnings[quality] && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-md animate-in fade-in duration-300">
                <p className="text-sm font-semibold text-amber-400 mb-1">
                  {qualityWarnings[quality]!.title}
                </p>
                <p className="text-xs text-amber-300/80">
                  {qualityWarnings[quality]!.body}
                </p>
              </div>
            )}
          </div>

          {/* Tombol Generate */}
       
{/* Kalkulator Estimasi Biaya */}
    <div className="mb-4 p-3 bg-gray-800/50 rounded-lg text-center border border-gray-700">
      <p className="text-sm text-gray-300">
        Estimasi biaya: <span className="text-purple-400 font-bold">{ (quality === '720p' ? 5 : quality === '1080p' ? 8 : 15) * clipCount } Token</span>
      </p>
    </div>

           <button
            onClick={handleGenerate}
            disabled={loading || !url}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold hover:scale-[1.02] transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Memproses...' : '✨ Generate Klip'}
          </button>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Clip Grid / Processing */}
        <section className="w-full max-w-6xl mx-auto py-12 px-6">
          {projectId && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Hasil Klip AI ✨</h2>
                {status === 'DONE' && clips.length > 0 && (
                  <span className="px-3 py-1 text-xs font-semibold bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">
                    {clips.length} Klip
                  </span>
                )}
              </div>
              <ClipGrid
                clips={clips}
                projectId={projectId}
                status={status}
                progress={progress}
                title={projectTitle}
              />
            </>
          )}
        </section>
      </main>
    </div>
  )
}
