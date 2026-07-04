// src/lib/plan.ts
// Utility untuk cek & reset plan expired

import { prisma } from './prisma'

/**
 * Cek plan user apakah expired. Kalo expired → reset ke FREE + token 15.
 * Panggil sebelum generate atau di dashboard.
 */
export async function checkPlanExpiry(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true, tokenBalance: true },
  })

  if (!user || !user.planExpiresAt) return // FREE user, no expiry to check

  // Kalo masih dalam masa aktif, skip
  if (new Date() < user.planExpiresAt) return

  // Expired! Reset ke FREE
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'FREE',
      planExpiresAt: null,
      tokenBalance: 15, // reset ke free tier
    },
  })

  console.log(`🔄 Plan expired for user ${userId} — reset to FREE (15 token)`)
}

/**
 * Aktifkan plan untuk user selama 30 hari
 */
export async function activatePlan(
  userId: string,
  plan: 'PRO' | 'ENTERPRISE',
  tokens: number
) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      planExpiresAt: expiresAt,
      tokenBalance: { increment: tokens },
    },
  })
}
