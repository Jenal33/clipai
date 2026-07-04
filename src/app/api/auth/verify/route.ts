import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  const email = searchParams.get("email")?.toLowerCase().trim()

  if (!token || !email) {
    return NextResponse.redirect(`${BASE_URL}/auth?verify=invalid`)
  }

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token } },
  })

  if (!record || record.expires < new Date()) {
    return NextResponse.redirect(`${BASE_URL}/auth?verify=expired`)
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  })

  // Token is single-use — delete after success.
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  })

  return NextResponse.redirect(`${BASE_URL}/auth?verify=success`)
}
