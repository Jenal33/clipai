import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || ''
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true'
const MIDTRANS_API_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

const PLANS: Record<string, { amount: number; tokens: number; label: string }> = {
  pro: { amount: 35000, tokens: 100, label: 'PRO' },
  enterprise: { amount: 150000, tokens: 999999, label: 'ENTERPRISE' },
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login dulu' }, { status: 401 })
    }

    const { plan } = await req.json()
    const cfg = PLANS[plan as string]
    if (!cfg) {
      return NextResponse.json({ error: 'Plan tidak valid' }, { status: 400 })
    }

    // Simpan payment record
    const payment = await prisma.payment.create({
      data: {
        orderId: `CLIPAI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: session.user.id,
        amount: cfg.amount,
        tokenAmount: cfg.tokens,
        status: 'PENDING',
      },
    })

    // Request Snap token dari Midtrans
    const body = JSON.stringify({
      transaction_details: {
        order_id: `CLIPAI-${payment.id}`,
        gross_amount: cfg.amount,
      },
      credit_card: { secure: true },
      customer_details: {
        first_name: session.user.name || 'User',
        email: session.user.email,
      },
      item_details: [{
        id: `plan-${plan}`,
        price: cfg.amount,
        quantity: 1,
        name: `ClipAI ${cfg.label} — ${cfg.tokens} token`,
      }],
    })

    const res = await fetch(MIDTRANS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64'),
      },
      body,
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error_messages?.join(', ') || 'Midtrans error')
    }

    // Update payment dengan snap token
    await prisma.payment.update({
      where: { id: payment.id },
      data: { snapToken: data.token },
    })

    return NextResponse.json({
      snapToken: data.token,
      redirectUrl: data.redirect_url,
      paymentId: payment.id,
    })

  } catch (err) {
    console.error('Payment error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
