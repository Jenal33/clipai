import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"

// Prompt system untuk viral hooks — pake AI chenzk.top (OpenAI-compatible)
const HOOK_SYSTEM_PROMPT = `Kamu adalah copywriter viral sosial media Indonesia. 
Tugasmu: bikin caption untuk klip video yang bikin orang BERHENTI scroll.

ATURAN WAJIB:
1. Mulai dengan hook yang BIKIN PENASARAN (bukan spoiler, tapi cliffhanger)
2. Pakai bahasa Indonesia kasual / Gen Z friendly
3. Sertakan 3-5 hashtag relevan
4. Format: HOOK (1-2 kalimat) → ISI SINGKAT (1-2 kalimat) → CTA

HOOK PATTERNS yang proven viral:
- "Hal ini yang nggak pernah diajarkan di sekolah..."
- "Gue hampir salah paham sampai..."
- "[angka] detik yang bisa ngubah [sesuatu] lo..."  
- "Jangan scroll dulu. [pertanyaan menggelitik]"
- "Mereka nggak mau lo tau soal..."

OUTPUT: Berikan 3 versi caption berbeda (pendek, medium, panjang) dalam format JSON:
{
  "captions": [
    {"type": "pendek", "text": "...", "platform": "tiktok"},
    {"type": "medium", "text": "...", "platform": "instagram"},
    {"type": "panjang", "text": "...", "platform": "youtube"}
  ]
}`

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { clipId, transcript, title, viralityScore } = await req.json()
    if (!clipId) {
      return NextResponse.json({ error: "clipId wajib diisi" }, { status: 400 })
    }

    // Cek token user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tokenBalance: true },
    })
    if (!user || user.tokenBalance < 1) {
      return NextResponse.json(
        { error: "Token habis. Beli token dulu ya!" },
        { status: 402 }
      )
    }

    const context = `
Judul video: ${title || "tidak diketahui"}
Virality score: ${viralityScore || 0}/100
Transkrip klip: ${transcript || "tidak tersedia"}
    `.trim()

    // Pake CHENZK_API_KEY (OpenAI-compatible) — gpt-5.4-mini
    const response = await fetch("https://chenzk.top/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CHENZK_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        max_tokens: 1024,
        messages: [
          { role: "system", content: HOOK_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Buatkan caption viral untuk klip ini:\n\n${context}\n\nRespond HANYA dengan JSON valid, tanpa markdown atau backtick.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Caption AI error:", err)
      return NextResponse.json({ error: "Gagal generate caption" }, { status: 500 })
    }

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content || ""

    let parsed: { captions: Array<{ type: string; text: string; platform: string }> }
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim())
    } catch {
      return NextResponse.json({ error: "Format caption tidak valid" }, { status: 500 })
    }

    // Potong 1 token per generate caption
    await prisma.user.update({
      where: { id: session.user.id },
      data: { tokenBalance: { decrement: 1 } },
    })

    // Simpan caption ke clip (ambil yang medium sebagai default)
    const defaultCaption = parsed.captions.find((c) => c.type === "medium")?.text
    if (defaultCaption && clipId) {
      await prisma.clip.update({
        where: { id: clipId },
        data: { transcript: defaultCaption },
      }).catch(() => {/* non-fatal */})
    }

    return NextResponse.json({ captions: parsed.captions })
  } catch (error) {
    console.error("Caption error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 })
  }
}
