"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      setMessage(data.message || data.error || "Cek email kamu untuk link reset password.")
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">✂️ ClipAI</h1>
          <p className="text-zinc-400 mt-2 text-sm">Lupa Password</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-900/50 border border-red-800 text-red-300 text-sm px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-900/50 border border-green-800 text-green-300 text-sm px-4 py-2 rounded-lg">
              {message}
            </div>
          )}

          <p className="text-zinc-400 text-sm">
            Masukkan email kamu. Link reset password akan dikirim ke email tersebut.
          </p>

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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Mengirim..." : "Kirim Link Reset"}
          </button>

          <div className="text-center">
            <Link href="/auth" className="text-sm text-purple-400 hover:underline">
              Kembali ke Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
