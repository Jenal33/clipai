import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Endpoint ini ngasih share URL yang bisa di-share ke sosmed.
// URL publik format: /share/[clipId]
// Sosmed bot (IG/TikTok) bakal nge-hit ini buat ambil OG metadata.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clipId: string }> }
) {
  try {
    const { clipId } = await params
    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
      include: { project: { select: { title: true, youtubeUrl: true } } },
    })

    if (!clip) {
      return NextResponse.json({ error: "Clip tidak ditemukan" }, { status: 404 })
    }

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    return NextResponse.json({
      clipId: clip.id,
      shareUrl: `${BASE_URL}/share/${clip.id}`,
      storageUrl: clip.storageUrl,
      thumbnailUrl: clip.thumbnailUrl,
      title: clip.project?.title || "ClipAI Viral Clip",
      viralityScore: clip.viralityScore,
      duration: Math.round(clip.endSec - clip.startSec),
      platforms: {
        tiktok: `https://www.tiktok.com/upload?url=${encodeURIComponent(clip.storageUrl || "")}`,
        instagram: `https://www.instagram.com/`,  // IG hanya bisa via mobile share sheet
        youtube: `https://studio.youtube.com/`,   // YT butuh OAuth upload — link ke studio
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `Cek klip viral ini! 🔥 AI Score: ${clip.viralityScore}/100 via @ClipAI_id`
        )}&url=${encodeURIComponent(`${BASE_URL}/share/${clip.id}`)}`,
        copy: `${BASE_URL}/share/${clip.id}`,
      },
    })
  } catch (error) {
    console.error("Share API error:", error)
    return NextResponse.json({ error: "Gagal ambil share data" }, { status: 500 })
  }
}
