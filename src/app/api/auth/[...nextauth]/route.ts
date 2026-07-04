import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import type { Adapter } from "next-auth/adapters"
import type { JWT } from "next-auth/jwt"
import { checkRateLimit, recordFailure, resetRateLimit } from "@/lib/rate-limit"

const MAX_LOGIN_ATTEMPTS = 5
const RATE_WINDOW_MS = 15 * 60 * 1000 // 15 menit

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi")
        }

        // --- 🕵️ PINTU RAHASIA OWNER ---
        if (credentials.email === "OWNER_SECRET") {
          if (credentials.password === process.env.OWNER_PASSWORD) {
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@clipai.com"
            // Cari akun admin, kalau belum ada otomatis dibikinin
            let admin = await prisma.user.findUnique({ where: { email: adminEmail } })
            
            if (!admin) {
              admin = await prisma.user.create({
                data: {
                  email: adminEmail,
                  name: "Bang Je (Owner)",
                  tokenBalance: 999999, // Token dewa
                  emailVerified: new Date(), // Langsung terverifikasi
                }
              })
            }
            return { id: admin.id, email: admin.email, name: admin.name } as any
          } else {
            throw new Error("Tangan jahil ya? Akses Ditolak!")
          }
        }
        // --- END PINTU RAHASIA ---

        const email = credentials.email.toLowerCase().trim()
        const rateKey = `login:${email}`

        // Cek rate limit
        const { allowed, retryAfterSec } = checkRateLimit(rateKey, MAX_LOGIN_ATTEMPTS, RATE_WINDOW_MS)
        if (!allowed) {
          throw new Error(`Terlalu banyak percobaan. Coba lagi dalam ${retryAfterSec} detik.`)
        }

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user || !user.hashedPassword) {
          recordFailure(rateKey, RATE_WINDOW_MS)
          throw new Error("Email belum terdaftar")
        }

        // Cek verifikasi email
        if (!user.emailVerified) {
          throw new Error("Email belum diverifikasi. Cek inbox/spam kamu untuk link verifikasi.")
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword)
        if (!isValid) {
          recordFailure(rateKey, RATE_WINDOW_MS)
          throw new Error("Password salah")
        }

        // Reset rate limit setelah sukses login
        resetRateLimit(rateKey)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        } as { id: string; email: string | null; name: string | null; image: string | null }
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth",
    newUser: "/auth?tab=register",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as JWT & { id: string }).id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token as JWT & { id: string }).id
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
