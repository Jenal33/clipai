import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encode } from 'next-auth/jwt'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (!password || password !== process.env.OWNER_PASSWORD) {
      return NextResponse.json({ error: 'Sandi owner salah' }, { status: 401 })
    }
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@clipai.com'
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } })
    if (!admin) {
      admin = await prisma.user.create({
        data: { email: adminEmail, name: 'Bang Je (Owner)', tokenBalance: 999999, emailVerified: new Date() },
      })
    }
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) return NextResponse.json({ error: 'NEXTAUTH_SECRET not configured' }, { status: 500 })
    
    // FIX: Gunakan fitur encode bawaan NextAuth biar formatnya valid (JWE)
    const token = await encode({
      token: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        picture: null,
        sub: admin.id,
        plan: 'ENTERPRISE',
        tokenBalance: 9999999,
      },
      secret: secret,
    })
    
    const response = NextResponse.json({ ok: true, user: { id: admin.id, email: admin.email, name: admin.name } })
    
    const isSecure = (process.env.NEXTAUTH_URL || '').startsWith('https') || req.url.startsWith('https')
    const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
    
    response.cookies.set(cookieName, token, {
      httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
    })
    return response
  } catch (err: any) {
    console.error('Owner login error:', err)
    return NextResponse.json({ error: err?.message || 'Gagal login owner' }, { status: 500 })
  }
}
