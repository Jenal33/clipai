import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const url = searchParams.get("url");
  const filename = searchParams.get("filename") || "clipai-video.mp4";

  if (!url) {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
  }

  try {
    // Server yang nge-fetch, jadi kebal blokiran CORS browser!
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mengambil video dari R2");

    return new Response(response.body, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": response.headers.get("content-type") || "video/mp4",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json({ error: "Gagal memproses download" }, { status: 500 });
  }
}
