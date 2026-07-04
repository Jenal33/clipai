// src/lib/tripay.ts
// Helper untuk Tripay API — payment gateway alternatif

const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY || ''
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY || ''
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE || ''
const TRIPAY_IS_SANDBOX = process.env.TRIPAY_IS_SANDBOX !== 'false'
const TRIPAY_BASE_URL = TRIPAY_IS_SANDBOX
  ? 'https://tripay.co.id/api-sandbox'
  : 'https://tripay.co.id/api'
const TRIPAY_RETURN_URL = process.env.TRIPAY_RETURN_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing`

export interface TripayCreateParams {
  method: string
  merchant_ref: string
  amount: number
  customer_name: string
  customer_email: string
  customer_phone?: string
  order_items: Array<{
    sku: string
    name: string
    price: number
    quantity: number
  }>
  expired_time?: number // menit, default 24 jam (1440)
}

export interface TripayCreateResponse {
  success: boolean
  message: string
  data?: {
    reference: string
    merchant_ref: string
    payment_method: string
    payment_name: string
    customer_name: string
    total_amount: number
    fee_merchant: number
    fee_customer: number
    total_fee: number
    amount_received: number
    pay_code: string // untuk bank transfer
    pay_url: string // untuk QRIS / e-wallet
    checkout_url: string
    status: string
    expired_at: string
    qr_url?: string // khusus QRIS
  }
}

export interface TripayCallbackData {
  reference: string
  merchant_ref: string
  payment_method: string
  payment_name: string
  customer_name: string
  customer_email: string
  total_amount: number
  fee_merchant: number
  fee_customer: number
  total_fee: number
  amount_received: number
  pay_code: string
  pay_url: string
  checkout_url: string
  status: string // PAID, UNPAID, EXPIRED, FAILED, REFUND
  expired_at: string
  paid_at: string
  signature: string
}

/**
 * Daftar metode pembayaran Tripay yang tersedia
 */
export const TRIPAY_METHODS = [
  { code: 'QRIS', name: 'QRIS (All QR)', icon: '📱', fee: 0.7 },
  { code: 'BCA', name: 'BCA Virtual Account', icon: '🏦', fee: 4000 },
  { code: 'BNI', name: 'BNI Virtual Account', icon: '🏦', fee: 4000 },
  { code: 'BRI', name: 'BRI Virtual Account', icon: '🏦', fee: 3500 },
  { code: 'MANDIRI', name: 'Mandiri Bill Payment', icon: '🏦', fee: 4000 },
  { code: 'PERMATA', name: 'Permata Virtual Account', icon: '🏦', fee: 3500 },
  { code: 'ALFAMART', name: 'Alfamart', icon: '🏪', fee: 2500 },
  { code: 'INDOMARET', name: 'Indomaret', icon: '🏪', fee: 2500 },
  { code: 'OVO', name: 'OVO', icon: '💰', fee: 1500 },
  { code: 'GOPAY', name: 'GoPay', icon: '💳', fee: 1500 },
  { code: 'SHOPEEPAY', name: 'ShopeePay', icon: '🛒', fee: 1500 },
]

// Rate fee merchant per metode
export function getMethodFee(methodCode: string, amount: number): number {
  const method = TRIPAY_METHODS.find(m => m.code === methodCode)
  if (!method) return 0
  if (method.fee < 100) return Math.round(amount * method.fee / 100) // percentage
  return method.fee // flat fee
}

/**
 * Buat transaksi Tripay
 */
export async function createTripayTransaction(
  params: TripayCreateParams
): Promise<TripayCreateResponse> {
  const body = {
    method: params.method,
    merchant_ref: params.merchant_ref,
    amount: params.amount,
    customer_name: params.customer_name,
    customer_email: params.customer_email,
    customer_phone: params.customer_phone || '',
    order_items: params.order_items,
    return_url: TRIPAY_RETURN_URL,
    expired_time: params.expired_time || 1440, // 24 jam
  }

  // Buat signature untuk request
  // Format: HMAC-SHA256(merchant_ref + amount, private_key)
  const signature = await createHmacSignature(
    params.merchant_ref + params.amount,
    TRIPAY_PRIVATE_KEY
  )

  const res = await fetch(`${TRIPAY_BASE_URL}/transaction/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TRIPAY_API_KEY}`,
      'X-Signature': signature,
    },
    body: JSON.stringify(body),
  })

  return res.json()
}

/**
 * Verifikasi signature callback dari Tripay
 */
export function verifyCallbackSignature(data: TripayCallbackData): boolean {
  // Format: HMAC-SHA256(merchant_ref + amount_received + payment_method + status + merchant_code, private_key)
  const rawString =
    data.merchant_ref +
    data.amount_received +
    data.payment_method +
    data.status +
    TRIPAY_MERCHANT_CODE

  const expectedSignature = cryptoHmacSha256(rawString, TRIPAY_PRIVATE_KEY)
  return data.signature === expectedSignature
}

/**
 * HMAC-SHA256 helper (Node.js native)
 */
function cryptoHmacSha256(data: string, key: string): string {
  const crypto = require('crypto')
  return crypto.createHmac('sha256', key).update(data).digest('hex')
}

// Versi promise-based untuk async
async function createHmacSignature(data: string, key: string): Promise<string> {
  return cryptoHmacSha256(data, key)
}
