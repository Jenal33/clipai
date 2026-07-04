const RESEND_API_KEY = process.env.RESEND_API_KEY
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'ClipAI <onboarding@resend.dev>'

if (!RESEND_API_KEY && process.env.NODE_ENV === 'production') {
  // Don't crash the build, but make the misconfiguration loud in prod logs.
  console.error('[email] RESEND_API_KEY is not set. Verification/reset emails will fail to send.')
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[email] Resend error:', res.status, body)
    throw new Error('Gagal mengirim email')
  }

  return res.json()
}

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${BASE_URL}/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  return sendEmail(
    email,
    'Verifikasi email ClipAI kamu',
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Verifikasi Email</h2>
        <p>Klik tombol di bawah untuk verifikasi akun ClipAI kamu. Link berlaku 24 jam.</p>
        <p><a href="${link}" style="background:#9333ea;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Verifikasi Email</a></p>
        <p style="color:#888;font-size:12px">Kalau tombol tidak jalan, copy link ini: ${link}</p>
      </div>
    `
  )
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${BASE_URL}/auth/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  return sendEmail(
    email,
    'Reset password ClipAI',
    `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Reset Password</h2>
        <p>Klik tombol di bawah untuk reset password ClipAI kamu. Link berlaku 1 jam. Kalau bukan kamu yang minta, abaikan email ini.</p>
        <p><a href="${link}" style="background:#9333ea;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a></p>
        <p style="color:#888;font-size:12px">Kalau tombol tidak jalan, copy link ini: ${link}</p>
      </div>
    `
  )
}
