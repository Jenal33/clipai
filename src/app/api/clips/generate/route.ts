// src/app/api/clips/generate/route.ts
// FIX: Progress stuck 95% — implementasi Fire-and-Forget + callback DONE

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { checkPlanExpiry } from '@/lib/plan'

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth check ──────────────────────────────────────────
    let session
    try {
      session = await getServerSession(authOptions)
    } catch (authErr) {
      console.error('❌ Session error (mungkin cookie expired/restart):', authErr)
      return NextResponse.json({ error: 'Sesi tidak valid. Silakan login ulang.' }, { status: 401 })
    }
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Parse body ──────────────────────────────────────────
    const { youtubeUrl, clipCount, quality } = await req.json()

    if (!youtubeUrl || (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be'))) {
      return NextResponse.json({ error: 'URL YouTube tidak valid' }, { status: 400 })
    }

    const TOKEN_COST = 3

    // ── 3. Cek plan expiry (otomatis reset kalo expired) ────────
    await checkPlanExpiry(session.user.id)

    // ── 4. Cek token balance ───────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tokenBalance: true },
    })

    if (!user || user.tokenBalance < TOKEN_COST) {
      return NextResponse.json(
        { error: 'Token tidak cukup. Silakan top up terlebih dahulu.' },
        { status: 402 }
      )
    }

    // ── 5. Buat project dulu (JANGAN potong token dulu) ─────────
    const project = await prisma.project.create({
      data: {
        youtubeUrl,
        status: 'QUEUED',
        progress: 0,
        tokenCost: TOKEN_COST,
        userId: session.user.id,
      },
    })

    // ── 6. Update status → PROCESSING ─────────────────────────
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'PROCESSING', progress: 5 },
    })

    // ── 7. FIRE-AND-FORGET ke Python backend ───────────────────
    fetch(`${process.env.PYTHON_BACKEND_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        youtubeUrl,
        clipCount: clipCount || 5,
        quality: quality || '720p',
        userId: session.user.id,
      }),
      signal: AbortSignal.timeout(600000),
    })
      .then((res) => res.json())
      .then(async (data) => {
        if (data.status === 'accepted') {
          console.log(`✅ Python accepted project ${project.id}, menunggu callback...`)
          return
        }

        console.log('✅ Python selesai, data diterima:', data)

        // Simpan clips ke DB
        if (data.clips && Array.isArray(data.clips) && data.clips.length > 0) {
          await prisma.clip.createMany({
            data: data.clips.map((clip: any) => ({
              projectId: project.id,
              title: clip.title || 'Klip Tanpa Judul',
              startSec: clip.startSec || 0,
              endSec: clip.endSec || 0,
              duration: (clip.endSec || 0) - (clip.startSec || 0),
              viralityScore: clip.viralityScore || 0,
              hook: clip.hook || '',
              reason: clip.reason || '',
              transcript: clip.transcript || '',
              storageUrl: clip.storageUrl || '',
              thumbnailUrl: clip.thumbnailUrl || null,
              tags: clip.tags || [],
              platform: clip.platform || [],
            })),
          })

          // ✅ POTONG TOKEN CUMA KALAU KLIP BERHASIL
          await prisma.user.update({
            where: { id: session.user.id },
            data: { tokenBalance: { decrement: TOKEN_COST } },
          })
        }

        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'DONE', progress: 100 },
        })

        console.log(`✅ Project ${project.id} selesai — status DONE`)
      })
      .catch(async (err) => {
        console.error('❌ Error dari Python backend:', err)

        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: 'FAILED',
            progress: 0,
            errorMessage: err?.message || 'Terjadi kesalahan saat memproses video',
          },
        })
        // ✅ Token TIDAK dipotong — hanya dipotong kalau klip benar-benar jadi
      })

    // ── 7. Langsung return ke UI — jangan tunggu Python selesai
    // UI akan polling /api/clips/status untuk update progress
    return NextResponse.json({
      success: true,
      projectId: project.id,
      message: 'Video masuk antrean, sedang diproses...',
    })

  } catch (err: any) {
    console.error('❌ Error di /api/clips/generate:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
