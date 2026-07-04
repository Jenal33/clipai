import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter" },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        hashedPassword,
        tokenBalance: 15,
        emailVerified: new Date(), // Langsung diverifikasi (Resend free tier terbatas)
      },
    })

    // TODO: Kirim email verifikasi beneran nanti kalo udah verify domain di Resend
    // const token = crypto.randomBytes(32).toString("hex")
    // await prisma.verificationToken.create({...})
    // await sendVerificationEmail(email, token)

    return NextResponse.json({
      message: "Akun berhasil dibuat! Langsung login aja.",
      id: user.id,
      email: user.email,
      verified: true,
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 }
    )
  }
}
