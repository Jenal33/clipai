"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { redirect } from "next/navigation"

type UserData = {
  id: string
  email: string
  name: string | null
  tokenBalance: number
  hashedPassword: string | null
  createdAt: string
  payments: { id: string; amount: number; status: string; createdAt: string }[]
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ""

  useEffect(() => {
    if (status === "loading") return
    if (!session || session.user?.email !== ADMIN_EMAIL) {
      redirect("/auth")
      return
    }
    fetchUsers()
  }, [session, status])

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Gagal ambil data")
      const data = await res.json()
      setUsers(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal load data")
    } finally {
      setLoading(false)
    }
  }

  async function updateToken(userId: string, amount: number) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tokenAdjustment: amount }),
      })
      if (!res.ok) throw new Error("Gagal update")
      fetchUsers()
    } catch {
      alert("Gagal update token")
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage users and tokens</p>
        </div>
        <button
          onClick={fetchUsers}
          className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 py-2 rounded-lg transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-800 text-red-300 text-sm px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wide">Total Users</p>
          <p className="text-2xl font-bold text-white mt-1">{users.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wide">Total Tokens</p>
          <p className="text-2xl font-bold text-white mt-1">
            {users.reduce((sum, u) => sum + u.tokenBalance, 0)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wide">Total Payments</p>
          <p className="text-2xl font-bold text-white mt-1">
            {users.reduce((sum, u) => sum + (u.payments?.length || 0), 0)}
          </p>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-center px-4 py-3 font-medium">Tokens</th>
              <th className="text-center px-4 py-3 font-medium">Payments</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-4 py-3 text-white">{user.email}</td>
                <td className="px-4 py-3 text-zinc-400">{user.name || "-"}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-purple-400 font-medium">{user.tokenBalance}</span>
                </td>
                <td className="px-4 py-3 text-center text-zinc-400">
                  {user.payments?.length || 0}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => updateToken(user.id, 50)}
                      className="text-xs bg-green-900/50 hover:bg-green-800 text-green-400 px-2 py-1 rounded transition"
                    >
                      +50
                    </button>
                    <button
                      onClick={() => updateToken(user.id, -10)}
                      className="text-xs bg-red-900/50 hover:bg-red-800 text-red-400 px-2 py-1 rounded transition"
                    >
                      -10
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Belum ada user
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
