"use client"

import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Ubah Video YouTube Jadi{" "}
            <span className="text-purple-400">Klip Viral</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-10 max-w-xl mx-auto leading-relaxed">
            ClipAI pakai GPT-5.4-mini untuk deteksi momen viral terbaik.
            Potong otomatis format 9:16 portrait, upload ke Cloudflare R2.
            Siap upload ke TikTok, Reels, dan Shorts.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/clipper"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition"
            >
              ✂️ Coba Gratis
            </Link>
            <Link
              href="/pricing"
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition"
            >
              Lihat Harga
            </Link>
          </div>
          <p className="text-sm text-zinc-500 mt-4">Gratis 15 token — cukup untuk 3 video</p>
        </div>
      </section>

      {/* FITUR */}
      <section className="py-24 px-6 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Kenapa ClipAI?</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { icon: "🧠", title: "AI Cerdas", desc: "GPT-5.4-mini analisis momen viral terbaik dari video kamu. Skor 0-100 + alasan kenapa." },
              { icon: "✂️", title: "Potong Otomatis", desc: "Format 9:16 portrait langsung jadi. Gak perlu edit manual — tinggal upload ke TikTok/Shorts." },
              { icon: "☁️", title: "Cloud Storage", desc: "Hasil klip otomatis terupload ke Cloudflare R2. Link langsung siap bagikan." },
            ].map((f, i) => (
              <div key={i} className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Cara Kerja</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Paste URL", desc: "Salin link YouTube" },
              { step: "2", title: "AI Analisis", desc: "Deteksi 5 momen viral" },
              { step: "3", title: "Klip Portrait", desc: "Format 9:16 siap upload" },
              { step: "4", title: "Upload", desc: "Ke R2 + link dibagikan" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-zinc-400 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HARGA */}
      <section className="py-24 px-6 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Pilih Paket</h2>
          <p className="text-zinc-400 text-center mb-16">Mulai gratis, upgrade kapan aja</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { name: "FREE", price: "Gratis", tokens: "15 token", desc: "Coba dulu", features: ["3 video", "5 klip/video", "Analisis GPT", "Format portrait"] },
              { name: "PRO", price: "Rp 35rb", tokens: "100 token", desc: "Untuk kreator", features: ["20 video", "5 klip/video", "Skor viral", "Prioritas cepat"] },
              { name: "ENTERPRISE", price: "Rp 150rb", tokens: "Unlimited", desc: "Untuk bisnis", features: ["Unlimited video", "Semua fitur", "Dukungan prioritas", "API akses"] },
            ].map((p, i) => (
              <div key={i} className={`rounded-2xl p-8 border ${i === 1 ? "bg-purple-900/30 border-purple-600" : "bg-zinc-900 border-zinc-800"}`}>
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <p className="text-3xl font-bold mb-1">{p.price}</p>
                <p className="text-sm text-zinc-400 mb-6">{p.tokens}</p>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f, j) => (
                    <li key={j} className="text-sm text-zinc-300">✅ {f}</li>
                  ))}
                </ul>
                <Link
                  href={i === 0 ? "/clipper" : "/pricing"}
                  className={`block text-center py-3 rounded-xl font-semibold transition ${
                    i === 1
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-white"
                  }`}
                >
                  {i === 0 ? "Coba Gratis" : "Beli"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center text-sm text-zinc-600 border-t border-zinc-800">
        ClipAI — dibuat oleh Bang Je. AI-powered video clipping tool.
      </footer>
    </div>
  )
}
