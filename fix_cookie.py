import os

BASE_DIR = "/home/je3393/clipai"

FILES_TO_FIX = {
    "src/app/api/auth/[...nextauth]/route.ts": r'''import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import type { Adapter } from "next-auth/adapters"
import type { JWT } from "next-auth/jwt"
import { checkRateLimit, recordFailure, resetRateLimit } from "@/lib/rate-limit"

const MAX_LOGIN_ATTEMPTS = 5
const RATE_WINDOW_MS = 15 * 60 * 1000

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi")
        }
        if (credentials.email === "OWNER_SECRET") {
          if (credentials.password === process.env.OWNER_PASSWORD) {
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@clipai.com"
            let admin = await prisma.user.findUnique({ where: { email: adminEmail } })
            if (!admin) {
              admin = await prisma.user.create({
                data: { email: adminEmail, name: "Bang Je (Owner)", tokenBalance: 999999, emailVerified: new Date() }
              })
            }
            return { id: admin.id, email: admin.email, name: admin.name } as any
          } else {
            throw new Error("Tangan jahil ya? Akses Ditolak!")
          }
        }
        const email = credentials.email.toLowerCase().trim()
        const rateKey = `login:${email}`
        const { allowed, retryAfterSec } = checkRateLimit(rateKey, MAX_LOGIN_ATTEMPTS, RATE_WINDOW_MS)
        if (!allowed) {
          throw new Error(`Terlalu banyak percobaan. Coba lagi dalam ${retryAfterSec} detik.`)
        }
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.hashedPassword) {
          recordFailure(rateKey, RATE_WINDOW_MS)
          throw new Error("Email belum terdaftar")
        }
        if (!user.emailVerified) {
          throw new Error("Email belum diverifikasi. Cek inbox/spam kamu untuk link verifikasi.")
        }
        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword)
        if (!isValid) {
          recordFailure(rateKey, RATE_WINDOW_MS)
          throw new Error("Password salah")
        }
        resetRateLimit(rateKey)
        return { id: user.id, email: user.email, name: user.name, image: user.image } as any
      },
    }),
  ],
  session: { strategy: "jwt" as const, maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/auth", newUser: "/auth?tab=register", error: "/auth" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as JWT & { id: string }).id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = (token as JWT & { id: string }).id
      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/auth") || url === baseUrl + "/auth") return `${baseUrl}/dashboard`
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }''',

    "src/app/api/auth/owner-login/route.ts": r'''import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SignJWT } from 'jose'

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
    const secretKey = new TextEncoder().encode(secret)
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const token = await new SignJWT({
      id: admin.id, email: admin.email, name: admin.name, picture: null, sub: admin.id,
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(expires.getTime() / 1000),
    }).setProtectedHeader({ alg: 'HS256' }).sign(secretKey)
    const response = NextResponse.json({ ok: true, user: { id: admin.id, email: admin.email, name: admin.name } })
    
    // FIX: Gunakan prefix __Secure- jika domain menggunakan https
    const isSecure = (process.env.NEXTAUTH_URL or '').startswith('https') or req.url.startswith('https')
    const cookieName = '__Secure-next-auth.session-token' if isSecure else 'next-auth.session-token'
    
    response.cookies.set(cookieName, token, {
      httpOnly: true, secure: isSecure, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
    })
    return response
  } catch (err: any) {
    console.error('Owner login error:', err)
    return NextResponse.json({ error: err?.message || 'Gagal login owner' }, { status: 500 })
  }
}'''
}

print("Mulai ngeberesin masalah cookie HTTPS...")

for path, content in FILES_TO_FIX.items():
    full_path = os.path.join(BASE_DIR, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Beres: {path}")

print("Selesai. Silakan restart server Next.js (npm run dev) lo.")
