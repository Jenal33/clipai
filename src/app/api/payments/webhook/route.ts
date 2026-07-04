import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || ''

function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const hash = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + MIDTRANS_SERVER_KEY)
    .digest('hex')
  return hash === signatureKey
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    const body = JSON.parse(raw)

    const { order_id, transaction_status, signature_key, gross_amount, status_code } = body

    // Verifikasi signature — Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
    if (!verifySignature(order_id, status_code, String(gross_amount), signature_key)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // Ambil payment ID dari order_id: CLIPAI-<id>
    const paymentId = order_id?.replace('CLIPAI-', '')
    if (!paymentId) {
      return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Update status berdasarkan Midtrans transaction_status
    let status: string
    if (['settlement', 'capture'].includes(transaction_status)) {
      status = 'SUCCESS'
      // Kasih token ke user
      await prisma.user.update({
        where: { id: payment.userId },
        data: { tokenBalance: { increment: payment.tokenAmount } },
      })
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      status = 'FAILED'
    } else if (['pending', 'challenge'].includes(transaction_status)) {
      status = 'PENDING'
    } else {
      status = 'UNKNOWN'
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status },
    })

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
