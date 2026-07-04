// src/app/api/clips/callback/route.ts
// Dipanggil Python backend setelah selesai process — simpan clips + potong token

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projectId, clips, transcript, r2Urls, error } = body

    if (!projectId) {
      return NextResponse.json({ error: 'projectId wajib diisi' }, { status: 400 })
    }

    // ── KALAU ERROR ────────────────────────────────────────
    if (error) {
      console.error(`❌ Callback error untuk project ${projectId}: ${error}`)
      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: 'FAILED',
          progress: 0,
          errorMessage: error,
        },
      })
      // ✅ TOKEN TIDAK DIPOTONG — karena klip gagal
      return NextResponse.json({ ok: true, note: 'Project marked as FAILED, token not deducted' })
    }

    // ── VALIDASI ────────────────────────────────────────────
    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: 'FAILED',
          progress: 0,
          errorMessage: 'Tidak ada klip yang dihasilkan',
        },
      })
      return NextResponse.json({ ok: true, note: 'No clips, marked FAILED' })
    }

    // ── AMBIL DATA PROJECT ─────────────────────────────────
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true, tokenCost: true, status: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 })
    }

    // ── SIMPAN KLIPS KE DB ─────────────────────────────────
    await prisma.clip.createMany({
      data: clips.map((clip: any, i: number) => ({
        projectId: project.id,
        title: clip.title || `Klip ${i + 1}`,
        startSec: clip.startSec || 0,
        endSec: clip.endSec || 0,
        duration: (clip.endSec || 0) - (clip.startSec || 0),
        viralityScore: clip.viralityScore || 0,
        hook: clip.hook || '',
        reason: clip.reason || '',
        transcript: transcript || clip.transcript || '',
        storageUrl: clip.storageUrl || (r2Urls && r2Urls[i]) || '',
        thumbnailUrl: clip.thumbnailUrl || null,
        tags: clip.tags || [],
        platform: clip.platform || [],
      })),
    })

    // ── POTONG TOKEN — CUMA KALAU KLIP BERHASIL ────────────
    await prisma.user.update({
      where: { id: project.userId },
      data: { tokenBalance: { decrement: project.tokenCost || 3 } },
    })

    // ── UPDATE STATUS PROJECT ──────────────────────────────
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'DONE', progress: 100 },
    })

    console.log(`✅ Callback selesai: project ${projectId} — ${clips.length} klip disimpan`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('❌ Error di callback:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
