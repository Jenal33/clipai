// ─── RATE LIMITER ───────────────────────────────────────────────
const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5        // maks 5 generate per menit per IP
const RATE_WINDOW = 60_000  // 1 menit

// Bersihin rateMap lama biar gak bocor memory
function cleanupRateMap() {
  const now = Date.now()
  rateMap.forEach((entry, ip) => {
    if (entry.resetAt < now) rateMap.delete(ip)
  })
}
setInterval(cleanupRateMap, 120_000) // tiap 2 menit

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  let entry = rateMap.get(ip)
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_WINDOW }
    rateMap.set(ip, entry)
  }
  entry.count++
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
  return { allowed: entry.count <= RATE_LIMIT, retryAfter }
}

// ─── MIDDLEWARE ─────────────────────────────────────────────────
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. RATE LIMIT: /api/clips/generate ──
  if (pathname === '/api/clips/generate') {
    const { allowed, retryAfter } = checkRateLimit(getClientIp(req))
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan. Coba lagi dalam ${retryAfter} detik.`,
          retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }
  }

  // ── 2. AUTH CHECK ──
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Dashboard → redirect ke /login kalau belum login
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // API generate → 401 kalau belum login
  if (pathname === '/api/clips/generate') {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized — silakan login dulu' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/clips/generate',
  ],
}
