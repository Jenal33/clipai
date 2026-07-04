'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { MessageCircle, ThumbsUp, ThumbsDown, Lightbulb, Skull, CheckCheck, Clock, ArrowLeft, Trash2, ChevronDown, ChevronUp, Mail, User } from 'lucide-react'

const moodIcons: Record<string, { icon: any; color: string; label: string }> = {
  praise:     { icon: ThumbsUp,   color: 'text-emerald-400', label: 'Pujian' },
  criticism:  { icon: ThumbsDown, color: 'text-rose-400',    label: 'Kritik' },
  suggestion: { icon: Lightbulb,  color: 'text-amber-400',   label: 'Saran' },
  rant:       { icon: Skull,      color: 'text-purple-400',  label: 'Cacian' },
}

export default function FeedbackDashboard() {
  const { data: session, status } = useSession()
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null) // null = all, 'true' = read, 'false' = unread
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({ total: 0, unread: 0, praise: 0, rant: 0 })

  if (status === 'loading') return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
  if (status === 'unauthenticated') redirect('/auth')

  const fetchFeedback = async (readFilter: string | null) => {
    setLoading(true)
    try {
      const params = readFilter ? `?read=${readFilter}` : ''
      const res = await fetch(`/api/feedback${params}`)
      if (!res.ok) throw new Error('Gagal fetch')
      const data = await res.json()
      setFeedbacks(data.feedbacks || [])
      setTotal(data.total || 0)
      
      // Hitung stats
      const allRes = await fetch('/api/feedback')
      if (allRes.ok) {
        const allData = await allRes.json()
        const all = allData.feedbacks || []
        setStats({
          total: allData.total || 0,
          unread: all.filter((f: any) => !f.read).length,
          praise: all.filter((f: any) => f.mood === 'praise').length,
          rant: all.filter((f: any) => f.mood === 'rant').length,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFeedback(filter) }, [filter])

  const markRead = async (ids: string[]) => {
    await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, read: true }),
    })
    fetchFeedback(filter)
  }

  const markAllRead = async () => {
    const unreadIds = feedbacks.filter(f => !f.read).map(f => f.id)
    if (unreadIds.length === 0) return
    await markRead(unreadIds)
  }

  const toggleExpand = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const timeAgo = (d: string) => {
    const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (sec < 60) return 'baru aja'
    if (sec < 3600) return `${Math.floor(sec/60)}m`
    if (sec < 86400) return `${Math.floor(sec/3600)}j`
    return `${Math.floor(sec/86400)}h`
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <MessageCircle className="w-7 h-7 text-purple-400" />
              Feedback — <span className="text-zinc-400">Kotak Cacian Makian</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Total {stats.total} pesan — {stats.unread} belum dibaca</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={markAllRead}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm text-zinc-300 transition flex items-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Tandai Dibaca
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', bg: 'bg-zinc-800' },
            { label: 'Belum Dibaca', value: stats.unread, color: 'text-rose-400', bg: 'bg-rose-900/20 border-rose-800/30' },
            { label: 'Pujian 😊', value: stats.praise, color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-800/30' },
            { label: 'Cacian 😤', value: stats.rant, color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-800/30' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-white/5 rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: null, label: 'Semua' },
            { id: 'false', label: 'Belum Dibaca' },
            { id: 'true', label: 'Sudah Dibaca' },
          ].map((f) => (
            <button
              key={String(f.id)}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === f.id
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-zinc-500">Belum ada feedback. Santai dulu bos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((fb: any) => {
              const mood = moodIcons[fb.mood] || moodIcons.rant
              const Icon = mood.icon
              const isExpanded = expanded.has(fb.id)

              return (
                <div
                  key={fb.id}
                  className={`rounded-xl border transition-all duration-200 ${
                    !fb.read
                      ? 'bg-zinc-800/50 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.05)]'
                      : 'bg-zinc-900/30 border-white/5'
                  }`}
                >
                  <button
                    onClick={() => {
                      toggleExpand(fb.id)
                      if (!fb.read) markRead([fb.id])
                    }}
                    className="w-full p-4 flex items-start gap-4 text-left"
                  >
                    {/* Mood Icon */}
                    <div className={`p-2 rounded-lg bg-black/40 ${mood.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mood.color} bg-black/30`}>
                          {mood.label}
                        </span>
                        {!fb.read && (
                          <span className="w-2 h-2 bg-purple-500 rounded-full" />
                        )}
                        <span className="text-[11px] text-zinc-600 ml-auto">{timeAgo(fb.createdAt)}</span>
                      </div>
                      <p className={`text-sm ${!fb.read ? 'text-white' : 'text-zinc-400'} line-clamp-2`}>
                        {fb.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-600">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {fb.name || fb.user?.name || fb.email || 'Anonim'}
                        </span>
                        {fb.page && (
                          <span className="flex items-center gap-1">
                            📄 {fb.page}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className="text-zinc-600 pt-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/5">
                      <div className="bg-black/40 rounded-xl p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {fb.message}
                      </div>
                      {fb.user?.email && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-zinc-600">
                          <Mail className="w-3.5 h-3.5" />
                          {fb.user.email}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
