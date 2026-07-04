import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        clips: {
          select: { id: true, startSec: true, endSec: true, viralityScore: true, tags: true }
        }
      }
    })

    return NextResponse.json(projects)
  } catch (err) {
    console.error('ERROR fetch user projects:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
