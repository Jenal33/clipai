// /api/feedback — POST submit, GET list (admin only)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, mood, page } = await req.json()
    
    if (!message || message.trim().length < 3) {
      return NextResponse.json({ error: 'Isi pesan dulu bos, minimal 3 karakter' }, { status: 400 })
    }

    let session
    try { session = await getServerSession(authOptions) } catch {}
    
    const feedback = await prisma.feedback.create({
      data: {
        name: name?.trim() || 'Anonim',
        email: email?.trim() || session?.user?.email || null,
        message: message.trim(),
        mood: mood || 'rant',
        page: page || 'unknown',
        userId: session?.user?.id || null,
      },
    })

    return NextResponse.json({ success: true, id: feedback.id })
  } catch (err: any) {
    console.error('Feedback error:', err)
    return NextResponse.json({ error: 'Gagal kirim feedback' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    let session
    try { session = await getServerSession(authOptions) } catch {}
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const read = searchParams.get('read') // "true", "false", or null (all)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (read === 'true') where.read = true
    else if (read === 'false') where.read = false

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { user: { select: { name: true, email: true, image: true } } },
      }),
      prisma.feedback.count({ where }),
    ])

    return NextResponse.json({ feedbacks, total, offset, limit })
  } catch (err: any) {
    console.error('Feedback GET error:', err)
    return NextResponse.json({ error: 'Gagal ambil feedback' }, { status: 500 })
  }
}

// PATCH — mark as read
export async function PATCH(req: NextRequest) {
  try {
    const { ids, read } = await req.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 })
    }

    await prisma.feedback.updateMany({
      where: { id: { in: ids } },
      data: { read: read ?? true },
    })

    return NextResponse.json({ success: true, updated: ids.length })
  } catch (err: any) {
    return NextResponse.json({ error: 'Gagal update' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
