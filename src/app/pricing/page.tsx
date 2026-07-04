'use client'

import { useSession, signIn } from 'next-auth/react'
import { useState } from 'react'

const PLANS = [
  {
    id: 'pro',
    name: 'PRO',
    price: 'Rp 35.000',
    tokens: '100 token',
    desc: 'Untuk kreator konten',
    features: [
      '100 token (≈33× generate)',
      '5 klip per video',
      'Skor virality AI',
      'Format portrait 9:16',
      'Upload ke Cloudflare R2',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    price: 'Rp 150.000',
    tokens: 'Unlimited',
    desc: 'Untuk bisnis & power user',
    features: [
      'Unlimited token',
      'Unlimited video',
      '5 klip per video',
      'Skor virality AI',
      'Format portrait 9:16',
      'Upload ke Cloudflare R2',
    ],
    popular: false,
  },
]

const TRIPAY_METHODS = [
  { code: 'QRIS', name: 'QRIS (All QR)', icon: '📱' },
  { code: 'GOPAY', name: 'GoPay', icon: '💳' },
  { code: 'SHOPEEPAY', name: 'ShopeePay', icon: '🛒' },
  { code: 'BCA', name: 'BCA Virtual Account', icon: '🏦' },
  { code: 'BNI', name: 'BNI Virtual Account', icon: '🏦' },
  { code: 'BRI', name: 'BRI Virtual Account', icon: '🏦' },
  { code: 'MANDIRI', name: 'Mandiri Bill Payment', icon: '🏦' },
  { code: 'ALFAMART', name: 'Alfamart', icon: '🏪' },
  { code: 'INDOMARET', name: 'Indomaret', icon: '🏪' },
]

export default function PricingPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // State untuk Tripay
  const [showMethodPicker, setShowMethodPicker] = useState<string | null>(null) // plan id
  const [paymentInfo, setPaymentInfo] = useState<{
    planId: string
    payCode?: string
    payUrl?: string
    checkoutUrl?: string
    method: string
    totalAmount: number
  } | null>(null)

  // ── Midtrans Flow ──
  const handleMidtransBuy = async (plan: string) => {
    setPaymentInfo(null)
    setShowMethodPicker(null)
    setLoading(plan)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')

      if (typeof window !== 'undefined' && (window as any).snap) {
        ;(window as any).snap.pay(data.snapToken, {
          onSuccess: async () => {
            try {
              const confirmRes = await fetch('/api/payments/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan, orderId: data.orderId }),
              })
              const confirmData = await confirmRes.json()
              if (confirmRes.ok) {
                setSuccess(confirmData.message)
              } else {
                setError(confirmData.error || 'Gagal konfirmasi')
              }
            } catch (e) {
              setError('Gagal konfirmasi pembayaran. Hubungi admin.')
            }
            setLoading(null)
          },
          onPending: () => { setSuccess('⏳ Pembayaran pending. Token akan ditambah otomatis.'); setLoading(null) },
          onError: () => { setError('❌ Pembayaran gagal. Coba lagi.'); setLoading(null) },
          onClose: () => { setLoading(null) },
        })
      } else {
        window.location.href = data.redirectUrl
      }
    } catch (e) {
      setError(String(e))
      setLoading(null)
    }
  }

  // ── Tripay Flow ──
  const handleShowMethods = (plan: string) => {
    setPaymentInfo(null)
    setError('')
    setSuccess('')
    setShowMethodPicker(showMethodPicker === plan ? null : plan)
  }

  const handleTripayPay = async (plan: string, method: string) => {
    setLoading(`${plan}-${method}`)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/payments/tripay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, method }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')

      setPaymentInfo({
        planId: plan,
        payCode: data.payCode,
        payUrl: data.payUrl,
        checkoutUrl: data.checkoutUrl,
        method,
        totalAmount: data.totalAmount,
      })

      setShowMethodPicker(null)
      setLoading(null)

      // Auto redirect ke checkout URL (QRIS/e-wallet)
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank')
      }
    } catch (e) {
      setError(String(e))
      setLoading(null)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('✅ Tersalin!')
    setTimeout(() => setSuccess(''), 2000)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Pilih Paket</h1>
          <p className="text-zinc-400 max-w-lg mx-auto">
            {session
              ? `Pilih paket & metode bayar — Midtrans (kartu/QRIS) atau Tripay (VA/Alfamart/QRIS)`
              : 'Login dulu buat beli paket.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-8 border relative ${
                plan.popular
                  ? 'bg-purple-900/30 border-purple-600'
                  : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-xs px-4 py-1 rounded-full font-semibold">
                  TERLARIS
                </div>
              )}
              <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
              <p className="text-zinc-400 text-sm mb-1">{plan.desc}</p>
              <p className="text-4xl font-bold mb-2">{plan.price}</p>
              <p className="text-sm text-zinc-500 mb-8">{plan.tokens}</p>

              <ul className="space-y-3 mb-10">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm text-zinc-300">✅ {f}</li>
                ))}
              </ul>

              {/* Tombol Midtrans */}
              <button
                onClick={() => session ? handleMidtransBuy(plan.id) : signIn('google')}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl font-semibold transition mb-3 ${
                  plan.popular
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                } disabled:opacity-50`}
              >
                {loading === plan.id ? 'Memproses...' : session ? `Beli ${plan.name} (Midtrans)` : 'Login untuk Beli'}
              </button>

              {/* Tombol Tripay */}
              {session && (
                <button
                  onClick={() => handleShowMethods(plan.id)}
                  className={`w-full py-3 rounded-xl font-semibold transition border ${
                    showMethodPicker === plan.id
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  💳 Bayar via Tripay
                </button>
              )}

              {/* Picker metode Tripay */}
              {showMethodPicker === plan.id && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-zinc-400 mb-2">Pilih metode:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {TRIPAY_METHODS.map((m) => (
                      <button
                        key={m.code}
                        onClick={() => handleTripayPay(plan.id, m.code)}
                        disabled={loading === `${plan.id}-${m.code}`}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-left disabled:opacity-50 transition"
                      >
                        <span>{m.icon}</span>
                        <span className="truncate">{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tampilkan info pembayaran Tripay — sesuai plan */}
              {paymentInfo && paymentInfo.planId === plan.id && (
                <div className="mt-4 p-4 rounded-xl bg-zinc-800/80 border border-emerald-600/30 space-y-3">
                  <p className="text-sm font-semibold text-emerald-400">💳 Menunggu Pembayaran</p>
                  <p className="text-xs text-zinc-400">Metode: {paymentInfo.method}</p>
                  <p className="text-xl font-bold">Rp {paymentInfo.totalAmount.toLocaleString('id-ID')}</p>

                  {paymentInfo.payCode && (
                    <div className="bg-zinc-900 rounded-lg p-3">
                      <p className="text-xs text-zinc-400 mb-1">Kode Pembayaran:</p>
                      <div className="flex items-center justify-between">
                        <code className="text-lg font-mono text-white tracking-widest">{paymentInfo.payCode}</code>
                        <button
                          onClick={() => handleCopy(paymentInfo.payCode!)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 ml-2 shrink-0"
                        >
                          Salin
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentInfo.checkoutUrl && (
                    <a
                      href={paymentInfo.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-center text-sm font-semibold transition"
                    >
                      🔗 Bayar Sekarang
                    </a>
                  )}

                  <p className="text-xs text-zinc-500">
                    Status otomatis terupdate setelah pembayaran dikonfirmasi Tripay.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div className="mt-8 text-center text-red-400">{error}</div>}
        {success && <div className="mt-8 text-center text-green-400">{success}</div>}
      </div>

      {/* Midtrans Snap JS — tetap untuk flow Midtrans */}
      <script
        src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/snap.js'}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ''}
        async
      />
    </div>
  )
}
