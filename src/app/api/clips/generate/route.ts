import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { checkPlanExpiry } from '@/lib/plan'

export async function POST(req: NextRequest) {
  try {
    let session = await getServerSession(authOptions)
    if (!session?.user?.id)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { youtubeUrl, clipCount, quality } = await req.json()

    // --- KALKULATOR TOKEN DINAMIS ---
    let costPerClip = 5
    if (quality === '1080p') costPerClip = 8
    if (quality === '4k') costPerClip = 15
    const totalTokenCost = costPerClip * (clipCount || 3)

    await checkPlanExpiry(session.user.id)

    // ── ATOMIC TRANSACTION — race condition safe ──
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock row user dengan select for update
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { tokenBalance: true }
      })

      if (!user || user.tokenBalance < totalTokenCost) {
        throw new Error(`Token tidak cukup. Perlu ${totalTokenCost}, punya ${user?.tokenBalance ?? 0}`)
      }

      // 2. Potong token DULU sebelum buat project
      const updatedUser = await tx.user.update({
        where: {
          id: session.user.id,
          tokenBalance: { gte: totalTokenCost } // double-check atomic
        },
        data: { tokenBalance: { decrement: totalTokenCost } }
      })

      // 3. Baru buat project
      const project = await tx.project.create({
        data: {
          youtubeUrl,
          status: 'QUEUED',
          progress: 0,
          tokenCost: totalTokenCost,
          userId: session.user.id
        }
      })

      return { project, remainingTokens: updatedUser.tokenBalance }
    })

    // 4. Update status ke PROCESSING (di luar transaction)
    await prisma.project.update({
      where: { id: result.project.id },
      data: { status: 'PROCESSING', progress: 5 }
    })

    // 5. Kick off Python backend (fire and forget)
    fetch(`${process.env.PYTHON_BACKEND_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: result.project.id,
        youtubeUrl,
        clipCount,
        quality,
        userId: session.user.id
      }),
      signal: AbortSignal.timeout(600000),
    }).catch(console.error)

    return NextResponse.json({
      success: true,
      projectId: result.project.id,
      remainingTokens: result.remainingTokens
    })

  } catch (err: any) {
    // Token tidak cukup atau race condition caught
    if (err.message?.includes('Token tidak cukup')) {
      return NextResponse.json({ error: err.message }, { status: 402 })
    }
    // Prisma update gagal karena tokenBalance < totalTokenCost (race condition)
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Request ditolak: token tidak cukup (concurrent request)' }, { status: 402 })
    }
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
