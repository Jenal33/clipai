"use client"

import { Suspense, useEffect, useState, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"login" | "register" | "owner">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [loading, setLoading] = useState(false)
  const clickCount = useRef(0) // Pakai useRef biar kebal klik cepat

  // Fungsi Easter Egg yang lebih kebal
  const handleLogoClick = () => {
    clickCount.current += 1
    
    if (clickCount.current >= 5) {
      clickCount.current = 0 // Langsung reset
      
      // Kasih jeda dikit biar UI nggak nge-freeze sebelum prompt muncul
      setTimeout(() => {
        const pwd = window.prompt("🕵️ Pintu Rahasia Owner:\nMasukkan sandi:")
        if (pwd) {
          setLoading(true)
          signIn("credentials", {
            email: "OWNER_SECRET",
            password: pwd,
            redirect: false,
          }).then((result) => {
            if (result?.error) {
              setError(result.error)
              setLoading(false)
            } else if (result?.ok) {
              window.location.href = "/dashboard" // Pakai hard redirect biar sesinya langsung refresh
            }
          })
        }
      }, 50)
    }
  }

  useEffect(() => {
    // --- DETEKSI LINK RAHASIA OWNER ---
    const secretKey = searchParams.get("akses")
    if (secretKey === "dewa") {
      setTab("owner")
      return // Stop eksekusi ke bawah
    }
    // --- END DETEKSI ---

    const t = searchParams.get("tab")
    setTab(t === "register" ? "register" : "login")

    const verify = searchParams.get("verify")
    if (verify === "success") {
      setInfo("Email berhasil diverifikasi. Silakan login.")
    } else if (verify === "expired") {
      setError("Link verifikasi sudah kedaluwarsa atau tidak valid.")
    } else if (verify === "invalid") {
      setError("Link verifikasi tidak valid.")
    }
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setInfo("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Email atau password salah" : result.error)
      } else if (result?.ok) {
        router.push("/dashboard")
      }
    } catch (err) {
      setError("Terjadi kesalahan. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  async function handleOwnerLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email: "OWNER_SECRET",
        password,
        redirect: false,
      })
      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        window.location.href = "/dashboard"
      }
    } catch (err) {
      setError("Gagal masuk.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setInfo("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Gagal mendaftar")
      } else {
        setInfo("Akun berhasil dibuat! Cek email kamu untuk verifikasi.")
        setEmail("")
        setPassword("")
        setName("")
      }
    } catch (err) {
      setError("Terjadi kesalahan. Coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold text-white cursor-default select-none transition-transform active:scale-95" 
            onClick={handleLogoClick}
          >
            ✂️ ClipAI
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">
            {tab === "owner" ? "🔑 Akses Owner" : tab === "login" ? "Login ke akun kamu" : "Buat akun baru"}
          </p>
        </div>

        {/* Tabs — pake Link biar gak butuh React event handler */}
        {tab !== "owner" && (
        <div className="flex mb-6 bg-zinc-800 rounded-lg p-1">
          <Link
            href="/auth"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition text-center block ${
              tab === "login"
                ? "bg-purple-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Login
          </Link>
          <Link
            href="/auth?tab=register"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition text-center block ${
              tab === "register"
                ? "bg-purple-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Daftar
          </Link>
        </div>
        )}

        {/* Form */}
        <form
          onSubmit={tab === "owner" ? handleOwnerLogin : tab === "login" ? handleLogin : handleRegister}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4"
        >
          {error && <div className="bg-red-900/50 text-red-300 text-sm px-4 py-2 rounded-lg">{error}</div>}
          {info && <div className="bg-green-900/50 text-green-300 text-sm px-4 py-2 rounded-lg">{info}</div>}

          {/* TAMPILAN KHUSUS OWNER */}
          {tab === "owner" ? (
            <div>
              <label className="block text-sm text-purple-400 font-bold mb-1">🔑 Sandi Akses Dewa</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan sandi rahasia..."
                autoFocus
                required
                className="w-full bg-black border border-purple-500/50 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          ) : (
            <>
              {tab === "register" && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Nama (opsional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama kamu"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className={"w-full py-2.5 rounded-lg font-medium text-sm transition disabled:opacity-50 " + (tab === "owner" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-600 hover:bg-purple-700 text-white")}
          >
            {loading ? "Memproses..." : tab === "owner" ? "Masuk Sebagai Owner" : tab === "login" ? "Login" : "Daftar Gratis"}
          </button>

          {tab === "register" && (
            <p className="text-zinc-500 text-xs text-center">
              Daftar = dapet <span className="text-purple-400 font-medium">15 token gratis</span> buat cobain ClipAI setelah verifikasi email
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
