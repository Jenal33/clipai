import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const OWNER_SECRET = process.env.OWNER_SECRET || 'clipai123'

const GRANTS: Record<string, { tokens: number; plan: string; days: number }> = {
  pro: { tokens: 100, plan: 'CREATOR', days: 30 },
  enterprise: { tokens: 999999, plan: 'STUDIO', days: 30 },
  topup50: { tokens: 50, plan: 'FREE', days: 0 },
  topup100: { tokens: 100, plan: 'FREE', days: 0 },
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login dulu' }, { status: 401 })
    }

    const { grant, secret } = await req.json()

    // Owner check
    if (secret !== OWNER_SECRET) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const cfg = GRANTS[grant as string]
    if (!cfg) {
      return NextResponse.json({ error: 'Grant tidak valid. Pilihan: pro, enterprise, topup50, topup100' }, { status: 400 })
    }

    const planExpiresAt = cfg.days > 0
      ? new Date(Date.now() + cfg.days * 24 * 60 * 60 * 1000)
      : undefined

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        tokenBalance: { increment: cfg.tokens },
        plan: cfg.plan as any,
        ...(planExpiresAt ? { planExpiresAt } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      message: `✅ Dapat ${cfg.tokens} token${cfg.plan !== 'FREE' ? ` + Plan ${cfg.plan}` : ''}`,
      grant,
    })

  } catch (err) {
    console.error('Grant error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
