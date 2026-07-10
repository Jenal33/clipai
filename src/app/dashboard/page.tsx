'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Coins, Film, Clock, TrendingUp, Zap,
  Crown, Sparkles, AlertCircle, ChevronRight,
  BarChart3
} from 'lucide-react'

// ─── TIPE ───────────────────────────────────────────────
interface UserData {
  id: string
  name: string | null
  email: string
  image: string | null
  tokenBalance: number
  plan: 'FREE' | 'CREATOR' | 'STUDIO' | 'ENTERPRISE'
  planExpiresAt: string | null
  createdAt: string
}

interface ProjectData {
  id: string
  status: string
  youtubeUrl: string
  createdAt: string
  clips: { id: string }[]
}

// ─── HELPERS ────────────────────────────────────────────
function getPlanBadge(plan: string) {
  switch (plan) {
    case 'CREATOR':
      return { label: 'CREATOR', color: 'bg-purple-600/20 text-purple-400 border-purple-500/30' }
    case 'STUDIO':
      return { label: 'STUDIO', color: 'bg-amber-600/20 text-amber-400 border-amber-500/30' }
    case 'ENTERPRISE':
      return { label: 'ENTERPRISE', color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' }
    default:
      return { label: 'FREE', color: 'bg-zinc-600/20 text-zinc-400 border-zinc-500/30' }
  }
}

function getDaysRemaining(expiresAt: string | null): number {
  if (!expiresAt) return 0
  const diff = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

// ─── CARD WRAPPER ──────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = false }: {
  icon: any; label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-5 transition-all duration-300 ${
      accent
        ? 'bg-gradient-to-br from-purple-600/15 to-blue-600/5 border-purple-500/20'
        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${
          accent ? 'bg-purple-600/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'
        }`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissFirstRun, setDismissFirstRun] = useState(false)

  // ── FETCH USER DATA + PROJECTS ──────────────────────────
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth?akses=dewa')
      return
    }
    if (sessionStatus !== 'authenticated') return

    async function fetchData() {
      try {
        const [userRes, projectRes] = await Promise.all([
          fetch('/api/admin/users?self=true'),
          fetch('/api/clips/user'),
        ])
        if (userRes.ok) {
          const users = await userRes.json()
          if (Array.isArray(users) && users.length > 0) setUserData(users[0])
        }
        if (projectRes.ok) {
          const data = await projectRes.json()
          setProjects(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error('Gagal fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [sessionStatus, router])

  // ── LOADING ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  const plan = userData?.plan || 'FREE'
  const badge = getPlanBadge(plan)
  const daysLeft = getDaysRemaining(userData?.planExpiresAt || null)
  const tokenBalance = userData?.tokenBalance ?? 0
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => p.status === 'PROCESSING' || p.status === 'QUEUED').length
  const completedProjects = projects.filter(p => p.status === 'DONE').length
  const isFree = plan === 'FREE'
  const isExpiringSoon = !isFree && daysLeft <= 3
  const isNewUser = isFree && totalProjects === 0
  const showFirstRun = isNewUser && !dismissFirstRun

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ════════════════════════════════════════════════════════
          FIRST-RUN BANNER — cuma buat user FREE + 0 project
         ════════════════════════════════════════════════════════ */}
      {showFirstRun && (
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/40 via-blue-900/20 to-purple-900/40 border-b border-purple-500/10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.08),transparent_50%)]" />
          <div className="relative max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-purple-600/20 border border-purple-500/20">
              <Sparkles size={24} className="text-purple-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-white font-semibold text-lg">
                🚀 Selamat datang di ClipAI!
              </p>
              <p className="text-zinc-400 text-sm mt-1">
                Kamu punya <strong className="text-white">15 token gratis</strong> buat mulai bikin klip viral. 
                Pilih paket biar dapat lebih banyak token + fitur eksklusif!
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDismissFirstRun(true)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
              Nanti
            </button>
              <Link
                href="/pricing"
                className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white hover:scale-105 transition-transform"
              >
              Lihat Paket
            </Link>
          </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          PLAN EXPIRY WARNING — tampil kalo ST/CREATOR tinggal 3 hari
         ════════════════════════════════════════════════════════ */}
      {isExpiringSoon && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
            <AlertCircle size={18} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300 flex-1">
              Paket <strong>{badge.label}</strong> kamu akan berakhir dalam <strong>{daysLeft} hari</strong>. 
              Perpanjang sekarang biar gak turun ke FREE!
            </p>
            <Link
              href="/pricing"
              className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 rounded-lg text-white transition-colors shrink-0"
            >
              Perpanjang
            </Link>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT
         ════════════════════════════════════════════════════════ */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── HEADER ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {userData?.email || 'Selamat datang kembali'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Plan badge */}
            <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${badge.color}`}>
              {badge.label}
            </span>

            {/* Upgrade CTA — tampil kalo FREE atau hampir expired */}
            {(isFree || isExpiringSoon) && (
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold
                  bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white
                  hover:scale-105 transition-transform"
              >
                <Crown size={15} />
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* ── STATS GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Coins}
            label="Token"
            value={tokenBalance}
            sub={isFree ? 'Gratis' : `${daysLeft} hari tersisa`}
            accent
          />

          <StatCard
            icon={Film}
            label="Total Proyek"
            value={totalProjects}
            sub={`${completedProjects} selesai`}
          />

          <StatCard
            icon={Clock}
            label="Aktif"
            value={activeProjects}
            sub={activeProjects > 0 ? 'Sedang diproses...' : 'Tidak ada'}
          />

          <StatCard
            icon={BarChart3}
            label="Rata-rata Klip"
            value={completedProjects > 0
              ? Math.round(
                  projects
                    .filter(p => p.status === 'DONE')
                    .reduce((sum, p) => sum + (p.clips?.length || 0), 0) / completedProjects
                )
              : 0}
            sub={completedProjects > 0 ? 'per proyek' : 'Belum ada data'}
          />
        </div>

        {/* ── UPGRADE BANNER — kalo FREE + ada project ─────── */}
        {isFree && totalProjects > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-purple-900/20 to-blue-900/10 border border-purple-500/20 p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-purple-600/20">
                <Crown size={28} className="text-purple-400" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-white font-semibold text-lg">
                  Upgrade ke PRO & Dapatkan lebih banyak!
                </p>
                <p className="text-zinc-400 text-sm mt-1">
                  Token terbatas bikin kamu gak bisa maksimal. 
                  Dengan paket CREATOR, kamu dapat <strong className="text-white">100 token</strong> + fitur eksklusif!
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl
                  text-white hover:scale-105 transition-transform flex items-center gap-2 shrink-0"
              >
                Lihat Paket
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* ── PROJECT LIST ────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Proyek Terbaru</h2>
            <Link
              href="/clipper"
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              Buat Baru
              <ChevronRight size={14} />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
              <Film size={40} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-zinc-500 font-medium">Belum ada proyek</p>
              <p className="text-zinc-600 text-sm mt-1">
                Paste URL YouTube dan biarkan AI yang kerja!
              </p>
              <Link
                href="/clipper"
                className="inline-block mt-4 px-5 py-2.5 text-sm font-semibold
                  bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white
                  hover:scale-105 transition-transform"
              >
                ✨ Mulai Generate
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 10).map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/proyek/${project.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4
                    hover:border-zinc-700 hover:bg-zinc-900 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        project.status === 'DONE' ? 'bg-emerald-500'
                        : project.status === 'FAILED' ? 'bg-red-500'
                        : 'bg-amber-500 animate-pulse'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {project.youtubeUrl?.length > 50
                            ? project.youtubeUrl.slice(0, 50) + '...'
                            : project.youtubeUrl || 'Tanpa judul'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {formatDate(project.createdAt)}
                          {project.clips?.length > 0 && ` • ${project.clips.length} klip`}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                      project.status === 'DONE' ? 'bg-emerald-600/10 text-emerald-400'
                      : project.status === 'FAILED' ? 'bg-red-600/10 text-red-400'
                      : 'bg-amber-600/10 text-amber-400'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
