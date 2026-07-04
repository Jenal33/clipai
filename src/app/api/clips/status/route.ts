// src/app/api/clips/status/route.ts
// Dipanggil UI setiap 3 detik untuk cek progress

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId wajib diisi' }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id, // keamanan: hanya milik user ini
    },
    include: {
      clips: {
        orderBy: { viralityScore: 'desc' },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({
    status: project.status,       // QUEUED | PROCESSING | DONE | FAILED
    progress: project.progress,   // 0-100
    clips: project.clips,
    errorMessage: project.errorMessage || null,
  })
}
