'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import JSZip from 'jszip'

interface Clip {
  id: string
  title: string
  duration: number
  storageUrl: string
}

interface Project {
  id: string
  youtubeUrl: string
  status: string
  progress: number
  clips: Clip[]
}

export default function ProjectDetailClient() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [zipping, setZipping] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!params?.id) return

    async function fetchProjectData() {
      try {
        const res = await fetch(`/api/projects/${params.id}`)
        if (!res.ok) {
          if (res.status === 404) setError('Proyek tidak ditemukan.')
          else setError('Gagal mengambil data proyek.')
          return
        }
        const data = await res.json()
        setProject(data)
      } catch (err) {
        console.error(err)
        setError('Terjadi kesalahan koneksi.')
      } finally {
        setLoading(false)
      }
    }

    fetchProjectData()

    const interval = setInterval(() => {
      if (project && (project.status === 'DONE' || project.status === 'FAILED')) {
        clearInterval(interval)
        return
      }
      fetchProjectData()
    }, 5000)

    return () => clearInterval(interval)
  }, [params?.id, project?.status])

  // FUNGSI JALUR VIP: Menggunakan Proxy Server
  async function handleDownloadAllZip() {
    if (!project || project.clips.length === 0) return
    setZipping(true)
    try {
      const zip = new JSZip()
      let completed = 0

      await Promise.allSettled(
        project.clips.map(async (clip, idx) => {
          if (!clip.storageUrl) return
          const name = `clipai-${idx + 1}-${clip.id}.mp4`
          // Lewat proxy server biar gak diblokir CORS!
          const proxyUrl = `/api/download?url=${encodeURIComponent(clip.storageUrl)}&filename=${encodeURIComponent(name)}`
          
          const res = await fetch(proxyUrl)
          const blob = await res.blob()
          zip.file(name, blob)
          completed++
        })
      )

      if (completed === 0) return
      const blob = await zip.generateAsync({ type: "blob" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `ClipAI_Project_${project.id}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      console.error("Gagal ZIP:", e)
    } finally {
      setZipping(false)
    }
  }

  // DOWNLOAD SATUAN VIA PROXY
  async function handleDownloadSingle(url: string, id: string, idx: number) {
    const filename = `ClipAI-${idx + 1}-${id}.mp4`;
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    
    // Bikin link rahasia ke server kita sendiri, browser bakal langsung nurut download
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-center items-center gap-3">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 text-sm animate-pulse">Memuat detail proyek...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-8 flex flex-col justify-center items-center gap-4">
        <p className="text-xl text-red-400">{error || 'Proyek tidak ditemukan.'}</p>
        <Link href="/dashboard" className="bg-gray-800 px-4 py-2 rounded-lg text-sm transition hover:bg-gray-700 active:scale-95">
          Kembali ke Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Detail Proyek</h1>
          <Link href="/dashboard" className="bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium transition active:scale-95">
            Kembali
          </Link>
        </div>
        
        <div className="mb-8 p-5 bg-[#131825] rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">URL Sumber:</p>
          <a href={project.youtubeUrl} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline break-all text-sm md:text-base">
            {project.youtubeUrl}
          </a>
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
              project.status === 'DONE' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' :
              project.status === 'FAILED' ? 'bg-red-950/40 text-red-400 border-red-500/30' :
              'bg-amber-950/40 text-amber-400 border-amber-500/30 animate-pulse'
            }`}>
              {project.status === 'PROCESSING' ? '⏳ Sedang Diproses AI...' : `Status: ${project.status}`}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">Hasil Klip AI ✨</h2>
          
          {project.status === 'DONE' && project.clips.length > 0 && (
            <button
              onClick={handleDownloadAllZip}
              disabled={zipping}
              className="flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl
                bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50
                text-white disabled:text-white/60 transition-all duration-200 active:scale-95 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
            >
              {zipping ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengompres {project.clips.length} Klip...
                </>
              ) : (
                `Download All (${project.clips.length} klip)`
              )}
            </button>
          )}
        </div>
        
        {project.clips.length === 0 ? (
          <div className="p-10 text-center bg-[#131825] rounded-xl border border-gray-800 flex flex-col items-center gap-5 w-full max-w-2xl mx-auto shadow-lg">
            {project.status === 'PROCESSING' ? (
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-purple-400">
                    {(project.progress || 0) < 20 ? 'Mengunduh Video...' :
                     (project.progress || 0) < 50 ? 'AI Menganalisis Transkrip...' :
                     (project.progress || 0) < 85 ? 'Memotong & Merapikan Wajah...' :
                     'Menyelesaikan & Upload...'}
                  </span>
                  <span className="text-sm font-bold text-gray-200">{project.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3.5 overflow-hidden border border-gray-700">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-indigo-500 h-3.5 rounded-full transition-all duration-1000 ease-out relative"
                    style={{ width: `${project.progress || 0}%` }}
                  >
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0)_100%)] animate-[pulse_2s_infinite]"></div>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-4 animate-pulse">
                  Mohon tunggu di halaman ini. Proses berjalan secara real-time...
                </p>
              </div>
            ) : (
              <p className="text-red-400">Belum ada klip yang tersimpan atau proses gagal.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {project.clips.map((clip, idx) => (
              <div key={clip.id} className="bg-[#131825] rounded-2xl p-4 border border-gray-800 flex flex-col">
                <div className="mb-3 flex justify-between items-center">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-1 rounded-md text-xs font-bold shadow-lg">
                    #{idx + 1}
                  </span>
                  <span className="text-gray-400 text-xs font-medium">{clip.duration} dtk</span>
                </div>
                
                <div className="w-full aspect-[9/16] bg-black rounded-xl overflow-hidden mb-4 border border-gray-800">
                  <video 
                    src={clip.storageUrl} 
                    controls 
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="mt-auto">
                  <p className="text-sm font-semibold truncate mb-3 text-gray-200" title={clip.title}>
                    {clip.title}
                  </p>
                  
                  <button 
                    onClick={() => handleDownloadSingle(clip.storageUrl, clip.id, idx)}
                    className="flex justify-center items-center w-full bg-purple-600 hover:bg-purple-500 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
