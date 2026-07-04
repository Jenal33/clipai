import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 })
    }

    // Always return same message regardless of whether email exists (anti-enumeration)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.hashedPassword) {
      return NextResponse.json({
        message: "Kalau email terdaftar, link reset password sudah dikirim.",
      })
    }

    // Generate reset token (valid 1 jam)
    const token = crypto.randomBytes(32).toString("hex")
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 jam
      },
    })

    try {
      await sendPasswordResetEmail(email, token)
    } catch (emailErr) {
      console.error("[forgot] Gagal kirim email reset:", emailErr)
    }

    return NextResponse.json({
      message: "Kalau email terdaftar, link reset password sudah dikirim.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 }
    )
  }
}
