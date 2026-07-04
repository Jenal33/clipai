import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { token, email, password } = await req.json()

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: "Semua field wajib diisi" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      )
    }

    // Cari token valid
    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!record || record.email !== email || record.expires < new Date() || record.usedAt) {
      return NextResponse.json(
        { error: "Link reset tidak valid atau sudah kedaluwarsa" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.update({
      where: { email },
      data: { hashedPassword },
    })

    // Tandai token sudah dipakai
    await prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    })

    return NextResponse.json({ message: "Password berhasil direset. Silakan login." })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 }
    )
  }
}
