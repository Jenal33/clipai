// src/app/api/clips/progress/route.ts
// Dipanggil Python backend untuk update progress realtime

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { projectId, progress } = await req.json()

    if (!projectId || typeof progress !== 'number') {
      return NextResponse.json({ error: 'projectId dan progress wajib diisi' }, { status: 400 })
    }

    // Update progress, jangan ubah status kalo udah DONE/FAILED
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 })
    }

    // Jangan timpa status final
    if (project.status === 'DONE' || project.status === 'FAILED') {
      return NextResponse.json({ ok: true, note: 'Status sudah final, progress diabaikan' })
    }

    // Update progress, set status ke PROCESSING jika masih QUEUED
    await prisma.project.update({
      where: { id: projectId },
      data: {
        progress,
        status: project.status === 'QUEUED' ? 'PROCESSING' : project.status,
      },
    })

    console.log(`📊 Progress ${projectId}: ${progress}%`)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('❌ Error update progress:', err)
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
