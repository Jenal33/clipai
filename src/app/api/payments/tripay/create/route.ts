// src/app/api/payments/tripay/create/route.ts
// Buat transaksi Tripay — user milih payment method dulu

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createTripayTransaction } from '@/lib/tripay'

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

    const { plan, method } = await req.json()
    const cfg = PLANS[plan as string]
    if (!cfg) {
      return NextResponse.json({ error: 'Plan tidak valid' }, { status: 400 })
    }
    if (!method) {
      return NextResponse.json({ error: 'Pilih metode pembayaran' }, { status: 400 })
    }

    const merchantRef = `CLIPAI-${session.user.id.slice(0, 8)}-${Date.now()}`
    const userEmail = session.user.email || 'user@clipai.com'
    const userName = session.user.name || 'User'

    // Simpan payment record dulu
    const payment = await prisma.payment.create({
      data: {
        orderId: merchantRef,
        userId: session.user.id,
        amount: cfg.amount,
        tokenAmount: cfg.tokens,
        status: 'PENDING',
        paymentProvider: 'tripay',
        paymentMethod: method,
      },
    })

    // Buat transaksi ke Tripay
    const tripayRes = await createTripayTransaction({
      method,
      merchant_ref: merchantRef,
      amount: cfg.amount,
      customer_name: userName,
      customer_email: userEmail,
      order_items: [{
        sku: `plan-${plan}`,
        name: `ClipAI ${cfg.label} — ${cfg.tokens === 999999 ? 'Unlimited' : cfg.tokens} token`,
        price: cfg.amount,
        quantity: 1,
      }],
    })

    if (!tripayRes.success || !tripayRes.data) {
      throw new Error(tripayRes.message || 'Tripay error')
    }

    // Update payment dengan reference dari Tripay
    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentRef: tripayRes.data.reference },
    })

    return NextResponse.json({
      success: true,
      reference: tripayRes.data.reference,
      merchantRef,
      payCode: tripayRes.data.pay_code,        // kode pembayaran (VA)
      payUrl: tripayRes.data.pay_url,           // URL QRIS / e-wallet
      checkoutUrl: tripayRes.data.checkout_url, // URL checkout Tripay
      paymentMethod: method,
      totalAmount: cfg.amount,
    })

  } catch (err) {
    console.error('Tripay create error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
