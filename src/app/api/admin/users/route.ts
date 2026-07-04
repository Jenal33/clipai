import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ""

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(req.url)
  const selfOnly = searchParams.get("self") === "true"

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (selfOnly) {
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      select: {
        id: true, email: true, name: true, image: true,
        tokenBalance: true, plan: true, planExpiresAt: true,
        createdAt: true, updatedAt: true,
      },
    })
    return NextResponse.json([user])
  }

  if (session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    include: {
      payments: {
        select: { id: true, amount: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId, tokenAdjustment } = await req.json()

  if (!userId || typeof tokenAdjustment !== "number") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { tokenBalance: { increment: tokenAdjustment } },
  })

  return NextResponse.json({ id: user.id, tokenBalance: user.tokenBalance })
}
