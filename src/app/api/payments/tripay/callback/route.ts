// src/app/api/payments/tripay/callback/route.ts
// Webhook callback dari Tripay — update status pembayaran

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCallbackSignature, type TripayCallbackData } from '@/lib/tripay'
import { activatePlan } from '@/lib/plan'

const PLANS: Record<string, { tokens: number; label: 'PRO' | 'ENTERPRISE' }> = {
  pro: { tokens: 100, label: 'PRO' },
  enterprise: { tokens: 999999, label: 'ENTERPRISE' },
}

export async function POST(req: NextRequest) {
  try {
    const data: TripayCallbackData = await req.json()

    // 1. Verifikasi signature
    if (!verifyCallbackSignature(data)) {
      console.error('❌ Tripay callback: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    console.log('📩 Tripay callback:', data.merchant_ref, data.status)

    // 2. Cari payment record
    const payment = await prisma.payment.findUnique({
      where: { orderId: data.merchant_ref },
    })

    if (!payment) {
      console.error('❌ Payment not found:', data.merchant_ref)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // 3. Update payment status berdasarkan callback
    const tripayStatus = data.status.toUpperCase()

    if (tripayStatus === 'PAID') {
      // Payment sukses — update payment + activate plan
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SETTLEMENT',
          paymentRef: data.reference,
          paymentMethod: data.payment_method,
          settledAt: new Date(),
        },
      })

      // 4. Cari plan dari amount
      // Karena amount bisa unik, kita cocokin amount dengan known plans
      const planEntry = Object.entries(PLANS).find(
        ([, cfg]) => cfg.tokens === payment.tokenAmount || cfg.label === payment.tokenAmount.toString()
      )

      // Fallback: match based on token amount
      let planName: 'PRO' | 'ENTERPRISE' = 'PRO'
      let tokenAmount = payment.tokenAmount

      for (const [key, cfg] of Object.entries(PLANS)) {
        if (cfg.tokens === payment.tokenAmount) {
          planName = cfg.label
          break
        }
        // Handle "unlimited" (999999)
        if (payment.tokenAmount >= 999998) {
          planName = 'ENTERPRISE'
          break
        }
      }

      // Activate plan untuk user
      await activatePlan(payment.userId, planName, tokenAmount)

      console.log(`✅ Tripay: ${data.merchant_ref} — ${planName} activated for user ${payment.userId}`)
    } else {
      // UNPAID, EXPIRED, FAILED, REFUND
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: tripayStatus,
          paymentRef: data.reference,
          paymentMethod: data.payment_method,
        },
      })

      console.log(`⚠️ Tripay: ${data.merchant_ref} — status ${tripayStatus}`)
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Tripay callback error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
