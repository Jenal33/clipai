# 🎬 ClipAI — Prompt Fix 6 File untuk Claude Code

## Instruksi Umum

Baca semua file di bawah, lalu **kerjakan 3 bug fix** dengan urutan prioritas berikut:

**JANGAN:** ubah kode lain yg udah jalan, refactor besar-besaran, atau nambah fitur baru.  
**JANGAN:** ubah AssemblyAI API key yang hardcode di `main.py`.  
**WAJIB:** minimal changes, fokus di bug yang disebut.

---

## 🚨 BUG 1: Login Owner Redirect Loop

**Masalah:** Pas owner login via `/auth?akses=dewa`:
- Submit password → malah balik ke form login biasa (redirect loop)
- Easter egg 5x klik logo → gak bisa login juga

**Yang harus di-fix:**
1. `src/app/api/auth/[...nextauth]/route.ts` — pastiin ada `redirect` callback biar gak redirect loop, dan cookie `secure: true`
2. `src/app/api/auth/owner-login/route.ts` — pastiin cookie `secure: true` (karena tunnel pake HTTPS, bukan HTTP localhost)
3. `src/app/auth/page.tsx` — bersihin flow `handleOwnerLogin`

### File 1: src/app/api/auth/[...nextauth]/route.ts

```typescript
import NextAuth, { NextAuthOptions } from "next-auth"
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
        // --- PINTU RAHASIA OWNER ---
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
        // --- END PINTU RAHASIA ---
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
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    },
  },
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
      if (url.startsWith("/auth") || url === baseUrl + "/auth") return "/dashboard"
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### File 2: src/app/api/auth/owner-login/route.ts

```typescript
// Bypass NextAuth CSRF — langsung bikin JWT manual & set cookie
import { NextRequest, NextResponse } from 'next/server'
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
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
    })
    return response
  } catch (err: any) {
    console.error('Owner login error:', err)
    return NextResponse.json({ error: err?.message || 'Gagal login owner' }, { status: 500 })
  }
}
```

### File 3: src/app/auth/page.tsx

```typescript
"use client"
import { Suspense, useEffect, useState, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [loading, setLoading] = useState(false)
  const clickCount = useRef(0)

  const aksesParam = searchParams?.get("akses")
  const tabParam = searchParams?.get("tab")
  const verifyParam = searchParams?.get("verify")
  const tab: "login" | "register" | "owner" =
    aksesParam === "dewa" ? "owner" : tabParam === "register" ? "register" : "login"

  const hasShownVerify = useRef(false)
  useEffect(() => {
    if (hasShownVerify.current) return
    if (verifyParam === "success") { setInfo("Email berhasil diverifikasi. Silakan login."); hasShownVerify.current = true }
    else if (verifyParam === "expired") { setError("Link verifikasi sudah kedaluwarsa."); hasShownVerify.current = true }
    else if (verifyParam === "invalid") { setError("Link verifikasi tidak valid."); hasShownVerify.current = true }
  }, [verifyParam])

  const handleLogoClick = () => {
    clickCount.current += 1
    if (clickCount.current >= 5) {
      clickCount.current = 0
      setTimeout(() => {
        const pwd = window.prompt("🕵️ Pintu Rahasia Owner:\nMasukkan sandi:")
        if (pwd) {
          setLoading(true)
          fetch("/api/auth/owner-login", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwd }),
          }).then(r => r.json()).then(data => {
            if (!data.ok) { setError(data.error || "Sandi salah"); setLoading(false) }
            else { window.location.href = "/dashboard" }
          }).catch(() => { setError("Gagal masuk."); setLoading(false) })
        }
      }, 50)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setInfo(""); setLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) setError(result.error === "CredentialsSignin" ? "Email atau password salah" : result.error)
      else if (result?.ok) router.push("/dashboard")
    } catch (err) { setError("Terjadi kesalahan. Coba lagi.") }
    finally { setLoading(false) }
  }

  async function handleOwnerLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true)
    try {
      const res = await fetch("/api/auth/owner-login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || "Gagal masuk owner")
      else window.location.href = "/dashboard"
    } catch (err) { setError("Gagal masuk.") }
    finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(""); setInfo(""); setLoading(true)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || "Gagal mendaftar")
      else { setInfo("Akun berhasil dibuat! Cek email kamu untuk verifikasi."); setEmail(""); setPassword(""); setName("") }
    } catch (err) { setError("Terjadi kesalahan. Coba lagi.") }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white cursor-default select-none transition-transform active:scale-95" onClick={handleLogoClick}>✂️ ClipAI</h1>
          <p className="text-zinc-400 mt-2 text-sm">{tab === "owner" ? "🔑 Akses Owner" : tab === "login" ? "Login ke akun kamu" : "Buat akun baru"}</p>
        </div>
        {tab !== "owner" && (
          <div className="flex mb-6 bg-zinc-800 rounded-lg p-1">
            <Link href="/auth" className={`flex-1 py-2 text-sm font-medium rounded-md transition text-center block ${tab === "login" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}>Login</Link>
            <Link href="/auth?tab=register" className={`flex-1 py-2 text-sm font-medium rounded-md transition text-center block ${tab === "register" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"}`}>Daftar</Link>
          </div>
        )}
        <form onSubmit={tab === "owner" ? handleOwnerLogin : tab === "login" ? handleLogin : handleRegister} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          {error && <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg">{error}</div>}
          {info && <div className="bg-green-900/50 text-green-300 text-sm px-4 py-2 rounded-lg">{info}</div>}
          {tab === "owner" ? (
            <div>
              <label className="block text-sm text-purple-400 font-bold mb-1">🔑 Sandi Akses Dewa</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan sandi rahasia..." autoFocus required className="w-full bg-black border border-purple-500/50 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
          ) : (
            <>
              {tab === "register" && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Nama (opsional)</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
                </div>
              )}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500" />
              </div>
            </>
          )}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 bg-purple-600 hover:bg-purple-700 text-white">
            {loading ? "Memproses..." : tab === "owner" ? "Masuk Sebagai Owner" : tab === "login" ? "Login" : "Daftar Gratis"}
          </button>
          {tab === "register" && (
            <p className="text-zinc-500 text-xs text-center">Daftar = dapet <span className="text-purple-400 font-medium">15 token gratis</span> buat cobain ClipAI setelah verifikasi email</p>
          )}
        </form>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-zinc-400">Loading...</div></div>}>
      <AuthForm />
    </Suspense>
  )
}
```

---

## 📱 BUG 2: Menu Hamburger HP Gak Jalan / Animasi Ilang

**Masalah:**
- Klik ikon 3 garis di pojok kanan atas (mobile) gak nge-dropdown menu
- Kadang animasi fade-in-up ilang
- Di HP, tombol Login/Daftar di hamburger gak responsif

**Fix:**
1. `src/components/Navbar.tsx` — tambah backdrop overlay, click-away handler, `key` prop biar animasi muter tiap buka
2. `src/app/globals.css` — tambah `@keyframes slide-down` + `@keyframes fade-in`

### File 4: src/components/Navbar.tsx

```typescript
'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const menuRef = useRef<HTMLDivElement>(null);

  // Click away handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Lock scroll pas menu terbuka
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <nav className="w-full sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-wider flex items-center gap-1">✂️ Clip<span className="text-purple-500">AI</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/clipper" className="text-sm text-gray-300 hover:text-white transition">Clipper</Link>
            <Link href="/pricing" className="text-sm text-gray-300 hover:text-white transition">Pricing</Link>
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white transition">Dashboard</Link>
            {status === 'authenticated' && session?.user ? (
              <div className="flex items-center gap-2 bg-white/5 pl-3 pr-1 py-1 rounded-full border border-white/10">
                <span className="text-xs text-gray-400">{session.user.email}</span>
                {session.user.email === 'jenalsosmed@gmail.com' && <span className="bg-purple-600 text-[10px] font-bold px-2 py-1 rounded-full">OWNER</span>}
                <button onClick={() => signOut({ callbackUrl: '/' })} className="text-[10px] text-gray-500 hover:text-red-400 ml-1 transition">✕</button>
              </div>
            ) : (
              <Link href="/auth" className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-full transition">Login</Link>
            )}
          </div>
          <div className="flex md:hidden" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none active:scale-95 transition-transform relative z-[60]" aria-label="Toggle menu">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden animate-fade-in" onClick={() => setIsOpen(false)} />}
      {isOpen && (
        <div key="mobile-menu" className="md:hidden bg-zinc-900/95 border-b border-white/10 fixed top-16 left-0 right-0 z-50 animate-slide-down">
          <div className="px-2 pt-2 pb-4 space-y-2 sm:px-3 text-center">
            <Link href="/clipper" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)}>Clipper</Link>
            <Link href="/pricing" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)}>Pricing</Link>
            <Link href="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)}>Dashboard</Link>
            <div className="border-t border-white/10 pt-3 mt-2">
              {status === 'authenticated' && session?.user ? (
                <>
                  <p className="text-xs text-gray-400">{session.user.email}</p>
                  {session.user.email === 'jenalsosmed@gmail.com' && <span className="inline-block bg-purple-600 text-[10px] font-bold px-3 py-1 rounded-full mt-1">OWNER</span>}
                  <button onClick={() => { setIsOpen(false); signOut({ callbackUrl: '/' }) }} className="block mx-auto mt-2 text-xs text-red-400 hover:text-red-300 transition">Logout</button>
                </>
              ) : (
                <Link href="/auth" className="block mx-auto w-fit text-sm bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full transition" onClick={() => setIsOpen(false)}>Login / Daftar</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
```

### File 5: src/app/globals.css

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
:root { --background: #ffffff; --foreground: #171717; }
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-plus-jakarta), var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
.dark { --background: #0a0a0a; --foreground: #ededed; }
body { background: var(--background); color: var(--foreground); font-family: Arial, Helvetica, sans-serif; }

@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.animate-shimmer { animation: shimmer 2s infinite; }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 8px; }
::-webkit-scrollbar-thumb:hover { background: #52525b; }
.text-balance { text-wrap: balance; }

@keyframes fade-in-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in-up { animation: fade-in-up 0.4s ease-out both; }

/* FIX: Animasi baru buat hamburger */
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.animate-fade-in { animation: fade-in 0.2s ease-out both; }
@keyframes slide-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.animate-slide-down { animation: slide-down 0.25s ease-out both; }

.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
@keyframes ring-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.6); } 50% { box-shadow: 0 0 0 12px rgba(168, 85, 247, 0); } }
.animate-ring-pulse { animation: ring-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
button, a { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }
```

---

## ⚙️ BUG 3: Progress Nyangkut & Fitur Face Tracking

**Masalah:**
1. Progress bar nyangkut — Python backend error diem-diem, gak notify Next.js
2. Face tracking (`face_tracker.py` + `reframe.py`) udah dibuat tapi gak dipake — `main.py` masih fallback crop center
3. FFmpeg error silent — gak nampilin error di log
4. Path hardcode `/home/je3393/clipai/...` — kalo deploy gak bakal jalan

**Fix:**
1. `python-backend/main.py` — pake face tracking sebagai primary, crop center sebagai fallback, path relatif, error traceback
2. `src/app/api/clips/generate/route.ts` — simpan `userId` di variable lokal biar aman di `.then()`

### File 6: python-backend/main.py

```python
import os
from dotenv import load_dotenv
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(dotenv_path): load_dotenv(dotenv_path)
else:
    parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
    if os.path.exists(parent_env): load_dotenv(parent_env)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import subprocess, json, httpx, re, time, shutil, traceback
import boto3
from integration_example import reframe_clip
from botocore.client import Config

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware,
    allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(','),
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

openai_client = OpenAI(api_key=os.getenv('CHENZK_API_KEY'), base_url="https://chenzk.top/v1")

QUALITY_PRESETS = {
    '720p':  {'target_height': 720,  'crf': 23, 'preset': 'veryfast'},
    '1080p': {'target_height': 1080, 'crf': 20, 'preset': 'veryfast'},
    '4k':    {'target_height': 2160, 'crf': 18, 'preset': 'veryfast'},
}

class ProcessRequest(BaseModel):
    projectId: str
    youtubeUrl: str
    clipCount: int = 5
    quality: str = '720p'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLIPS_DIR = os.path.join(BASE_DIR, '..', 'public', 'clips')
os.makedirs(CLIPS_DIR, exist_ok=True)

def get_r2_client():
    return boto3.client('s3',
        endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        config=Config(signature_version='s3v4'), region_name='auto')

def upload_clip_to_r2(local_path: str, project_id: str, filename: str) -> str:
    bucket = os.getenv('R2_BUCKET_NAME', 'clipai-videos')
    if not os.getenv('R2_ACCOUNT_ID') or not os.getenv('R2_ACCESS_KEY_ID'):
        print(f"R2 not configured, saving locally: {local_path}")
        return f"/clips/{project_id}/{filename}"
    r2_key = f"clips/{project_id}/{filename}"
    client = get_r2_client()
    with open(local_path, 'rb') as f:
        client.upload_fileobj(f, bucket, r2_key, ExtraArgs={'ContentType': 'video/mp4'})
    public_url = os.getenv('R2_PUBLIC_URL', '').rstrip('/')
    return f"{public_url}/{r2_key}" if public_url else \
        client.generate_presigned_url('get_object', Params={'Bucket': bucket, 'Key': r2_key}, ExpiresIn=604800)

def update_progress(project_id: str, progress_value: int):
    try:
        with httpx.Client() as client:
            client.post("http://localhost:3000/api/clips/progress",
                json={"projectId": project_id, "progress": progress_value}, timeout=5.0)
        print(f"Progress: {progress_value}%")
    except Exception as e:
        print(f"Gagal update progress: {e}")

@app.get("/health")
def health(): return {"status": "ok"}

def process_in_background(req: ProcessRequest):
    try:
        video_path = f"/tmp/{req.projectId}.mp4"
        audio_path = f"/tmp/{req.projectId}.mp3"
        project_clips_dir = os.path.join(CLIPS_DIR, req.projectId)
        os.makedirs(project_clips_dir, exist_ok=True)

        update_progress(req.projectId, 15)
        print(f"Downloading: {req.youtubeUrl}")
        subprocess.run(["yt-dlp", "-f", "best[ext=mp4]/best", "--max-filesize", "500m",
            "--js-runtimes", "node", "-o", video_path, req.youtubeUrl], check=True)

        update_progress(req.projectId, 30)
        print("Extracting audio...")
        subprocess.run(["ffmpeg", "-i", video_path, "-vn", "-ar", "16000", "-ac", "1",
            "-b:a", "32k", audio_path, "-y"], check=True)

        update_progress(req.projectId, 40)
        print("Transcribing with AssemblyAI...")
        hdrs = {"authorization": "fee8cff6037748b78fda2bb7a707f025"}
        with open(audio_path, 'rb') as f:
            upload_res = httpx.post("https://api.assemblyai.com/v2/upload", headers=hdrs, content=f.read(), timeout=120.0)
        upload_res.raise_for_status()
        audio_url = upload_res.json()["upload_url"]
        req_res = httpx.post("https://api.assemblyai.com/v2/transcript", headers=hdrs,
            json={"audio_url": audio_url, "language_code": "id"}, timeout=60.0)
        req_res.raise_for_status()
        tid = req_res.json()["id"]
        while True:
            update_progress(req.projectId, 50)
            poll = httpx.get(f"https://api.assemblyai.com/v2/transcript/{tid}", headers=hdrs, timeout=60.0).json()
            if poll["status"] == "completed": transcript_text = poll["text"]; break
            elif poll["status"] == "error": raise ValueError(f"AssemblyAI Error: {poll['error']}")
            print(f"AssemblyAI processing... (ID: {tid})")
            time.sleep(5)
        print(f"Transcript: {len(transcript_text)} chars")

        update_progress(req.projectId, 70)
        print("Analyzing with GPT...")
        msg = openai_client.chat.completions.create(model="gpt-5.4-mini", max_tokens=2000,
            messages=[{"role": "user", "content": f"""Analisis transkripsi video berikut dan temukan {req.clipCount} momen terbaik untuk dijadikan klip viral TikTok/Shorts.
Transkripsi:\n{transcript_text}\nBerikan response JSON array: [{{"startSec":10.5,"endSec":45.2,"viralityScore":92,"reason":"Hook kuat","tags":["hook"]}}] Hanya JSON array."""}])
        clips_raw = msg.choices[0].message.content.strip()
        json_match = re.search(r'\[.*\]', clips_raw, re.DOTALL)
        if json_match: clips = json.loads(json_match.group())
        else: raise ValueError(f"No JSON: {clips_raw[:200]}")

        update_progress(req.projectId, 85)
        print(f"Cutting {len(clips)} clips dengan face tracking...")
        q = req.quality.lower().replace(' ', '')
        if q not in QUALITY_PRESETS: q = '720p'
        q_cfg = QUALITY_PRESETS[q]
        print(f"Quality: {req.quality} -> {q_cfg['target_height']}p")

        for i, clip in enumerate(clips):
            start, end = clip.get("startSec", 0), clip.get("endSec", 0)
            duration = end - start
            if duration <= 0: print(f"Clip {i+1} skip (duration={duration})"); clip["clipPath"] = None; continue
            trimmed = os.path.join(project_clips_dir, f"clip_{i+1}_trimmed.mp4")
            out_path = os.path.join(project_clips_dir, f"clip_{i+1}.mp4")
            r = subprocess.run(["ffmpeg", "-ss", str(start), "-i", video_path, "-t", str(duration),
                "-c", "copy", "-map", "0:v", "-map", "0:a?", trimmed, "-y"], capture_output=True, text=True)
            if r.returncode != 0: print(f"Trim gagal: {r.stderr[:200]}"); clip["clipPath"] = None; continue
            try:
                reframe_clip(trimmed, out_path, target_height=q_cfg['target_height'], crf=q_cfg['crf'], preset=q_cfg['preset'])
                print(f"Clip {i+1}: face-aware reframe OK")
            except Exception as rf_err:
                print(f"Face tracking gagal: {rf_err}, fallback crop center")
                w = q_cfg['target_height'] * 9 // 16 // 2 * 2; h = q_cfg['target_height']
                r2 = subprocess.run(["ffmpeg", "-i", trimmed, "-vf",
                    f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black",
                    "-c:v", "libx264", "-c:a", "aac", "-preset", q_cfg['preset'], "-crf", str(q_cfg['crf']),
                    out_path, "-y"], capture_output=True, text=True)
                if r2.returncode != 0: print(f"Fallback gagal: {r2.stderr[:200]}"); clip["clipPath"] = None; continue
            if os.path.exists(trimmed): os.remove(trimmed)
            clip["clipPath"] = out_path
            clip["title"] = clip.get("title", f"Klip {i+1}")
            clip["transcript"] = clip.get("transcript", transcript_text[:200])
            clip["hook"] = clip.get("hook", ""); clip["tags"] = clip.get("tags", [])
            clip["platform"] = clip.get("platform", ["TikTok", "Reels", "Shorts"])
            update_progress(req.projectId, int(85 + ((i+1)/len(clips))*10))
            print(f"Clip {i+1} selesai: {out_path}")

        update_progress(req.projectId, 95)
        print("Uploading to R2...")
        for i, clip in enumerate(clips):
            if clip.get("clipPath") and os.path.exists(clip["clipPath"]):
                clip["storageUrl"] = upload_clip_to_r2(clip["clipPath"], req.projectId, f"clip_{i+1}.mp4")
            else: clip["storageUrl"] = None

        if os.path.exists(audio_path): os.remove(audio_path)
        print("Callback ke Next.js...")
        with httpx.Client() as c:
            cr = c.post("http://localhost:3000/api/clips/callback",
                json={"projectId": req.projectId, "transcript": transcript_text, "clips": clips}, timeout=10.0)
            print(f"Callback OK: {cr.status_code}")
    except Exception as e:
        print(f"ERROR:\n{traceback.format_exc()}")
        try:
            with httpx.Client() as c:
                c.post("http://localhost:3000/api/clips/callback",
                    json={"projectId": req.projectId, "error": str(e)}, timeout=5.0)
        except: pass

@app.post("/process")
async def process_video(req: ProcessRequest):
    thread = threading.Thread(target=process_in_background, args=(req,))
    thread.start()
    return {"status": "accepted", "projectId": req.projectId, "message": "Processing in background"}
```

### File 7: src/app/api/clips/generate/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { checkPlanExpiry } from '@/lib/plan'

export async function POST(req: NextRequest) {
  try {
    let session
    try { session = await getServerSession(authOptions) }
    catch (authErr) { return NextResponse.json({ error: 'Sesi tidak valid. Login ulang.' }, { status: 401 }) }
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { youtubeUrl, clipCount, quality } = await req.json()
    const trimmedUrl = (youtubeUrl || '').trim()
    if (!trimmedUrl || (!trimmedUrl.includes('youtube.com') && !trimmedUrl.includes('youtu.be')))
      return NextResponse.json({ error: 'URL YouTube tidak valid' }, { status: 400 })

    const TOKEN_COST = 3
    await checkPlanExpiry(session.user.id)

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { tokenBalance: true } })
    if (!user || user.tokenBalance < TOKEN_COST)
      return NextResponse.json({ error: 'Token tidak cukup.' }, { status: 402 })

    const project = await prisma.project.create({
      data: { youtubeUrl, status: 'QUEUED', progress: 0, tokenCost: TOKEN_COST, userId: session.user.id },
    })
    await prisma.project.update({ where: { id: project.id }, data: { status: 'PROCESSING', progress: 5 } })

    const userId = session.user.id // simpan ref biar aman di callback

    fetch(`${process.env.PYTHON_BACKEND_URL}/process`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project.id, youtubeUrl, clipCount: clipCount || 5, quality: quality || '720p', userId }),
      signal: AbortSignal.timeout(600000),
    }).then(r => r.json()).then(async data => {
      if (data.status === 'accepted') { console.log(`Python accepted ${project.id}`); return }
      if (data.clips?.length > 0) {
        await prisma.clip.createMany({
          data: data.clips.map(c => ({ projectId: project.id, title: c.title || 'Klip', startSec: c.startSec||0, endSec: c.endSec||0, duration: (c.endSec||0)-(c.startSec||0), viralityScore: c.viralityScore||0, hook: c.hook||'', reason: c.reason||'', transcript: c.transcript||'', storageUrl: c.storageUrl||'', thumbnailUrl: c.thumbnailUrl||null, tags: c.tags||[], platform: c.platform||[] })),
        })
        await prisma.user.update({ where: { id: userId }, data: { tokenBalance: { decrement: TOKEN_COST } } })
      }
      await prisma.project.update({ where: { id: project.id }, data: { status: 'DONE', progress: 100 } })
    }).catch(async err => {
      console.error('Python error:', err)
      await prisma.project.update({ where: { id: project.id }, data: { status: 'FAILED', progress: 0, errorMessage: err?.message || 'Gagal' } })
    })

    return NextResponse.json({ success: true, projectId: project.id, message: 'Sedang diproses...' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
```

---

## Instruksi Final untuk Claude Code

1. **Baca setiap file** sesuai path di atas
2. **Fix BUG 1 (Login Owner):**
   - `src/app/api/auth/[...nextauth]/route.ts` — pastiin ada `redirect` callback + `cookies.sessionToken.secure: true`
   - `src/app/api/auth/owner-login/route.ts` — pastiin cookie `secure: true`
   - `src/app/auth/page.tsx` — pastiin `handleOwnerLogin` pake custom endpoint
3. **Fix BUG 2 (Hamburger HP):**
   - `src/components/Navbar.tsx` — tambah backdrop, click-away handler, `key` prop, `z-[60]`
   - `src/app/globals.css` — tambah animasi `slide-down` + `fade-in`
4. **Fix BUG 3 (Progress Nyangkut):**
   - `python-backend/main.py` — path relatif, face tracking primary, error traceback, progress per clip
   - `src/app/api/clips/generate/route.ts` — simpan `userId` ke variable lokal
5. **Setelah fix:** restart Next.js + Python, tes login owner & generate
6. **Pastikan tidak merusak** fitur yang udah jalan (UI auth, navbar, dashboard, payment)
