import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()
    
    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Data tidak valid. Password minimal 6 karakter.' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()
    const existingUser = await prisma.user.findUnique({ where: { email: emailLower } })
    
    if (existingUser) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Buat user baru di database
    await prisma.user.create({
      data: {
        name: name || '',
        email: emailLower,
        hashedPassword,
        tokenBalance: 15,
        emailVerified: new Date(), // FIX: Auto-verify aktif, langsung tembus login
      },
    })

    return NextResponse.json({ success: true, message: 'Akun berhasil dibuat' })
  } catch (err: any) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan saat mendaftar' }, { status: 500 })
  }
}
