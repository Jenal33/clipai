// src/app/api/payments/confirm/route.ts
// Dipanggil frontend saat Snap sukses — set plan + token + expiry 30 hari

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { activatePlan } from '@/lib/plan'

const PLANS: Record<string, { tokens: number; label: 'PRO' | 'ENTERPRISE' }> = {
  pro: { tokens: 100, label: 'PRO' },
  enterprise: { tokens: 999999, label: 'ENTERPRISE' },
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan, orderId } = await req.json()
    const cfg = PLANS[plan as string]
    if (!cfg) {
      return NextResponse.json({ error: 'Plan tidak valid' }, { status: 400 })
    }

    // Aktifkan plan 30 hari + tambah token
    await activatePlan(session.user.id, cfg.label, cfg.tokens)

    // Update payment record kalo ada orderId
    if (orderId) {
      await prisma.payment.updateMany({
        where: { orderId, userId: session.user.id },
        data: { status: 'SETTLEMENT', settledAt: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      message: `🎉 ${cfg.label} aktif 30 hari! ${cfg.tokens === 999999 ? 'Token unlimited' : cfg.tokens + ' token'} siap dipakai.`,
    })
  } catch (err) {
    console.error('Confirm payment error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
