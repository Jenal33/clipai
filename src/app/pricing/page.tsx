"use client";

import { useState } from "react";

export default function PricingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // FUNGSI UNTUK MENANGANI KLIK TOMBOL BELI
  const handleCheckout = (planId: string, method: string) => {
    // TODO: Ganti alert ini dengan fungsi pemanggilan API Midtrans / Tripay lo
    alert(`Lanjut pembayaran paket: ${planId} via ${method}. \n\n(Bang Jenal, taruh logika fetch ke /api/payments di sini ya!)`);
  };

  return (
    <div className="min-h-screen bg-[#0F0F13] text-white py-12 px-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Pilih Paket ClipAI</h1>
          <p className="text-gray-400">Pilih paket yang sesuai dengan kebutuhan konten lo</p>
        </div>

        {/* BUNGKUSAN KARTU HARGA */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* TIER 0: GRATIS */}
          <div className="bg-[#1A1A24] rounded-2xl p-6 border border-gray-800 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">GRATIS</h2>
            <p className="text-gray-400 text-sm mb-4">Uji coba kehebatan ClipAI</p>
            <div className="text-4xl font-bold mb-2">Rp 0</div>
            <p className="text-gray-400 text-sm mb-6">15 token</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-2">✅ <span>15 token gratis (Untuk 3x generate 720p)</span></li>
              <li className="flex gap-2">✅ <span>Maksimal 3 klip per generate</span></li>
              <li className="flex gap-2">✅ <span>Kualitas terkunci di 720p</span></li>
              <li className="flex gap-2 text-gray-500">❌ <span>Skor virality AI</span></li>
              <li className="flex gap-2 text-gray-500">❌ <span>Upload ke Cloudflare R2</span></li>
            </ul>
            
            <div className="space-y-3 mt-auto">
              <button className="w-full bg-[#2A2A35] text-gray-300 cursor-not-allowed py-3 rounded-xl font-bold">Plan Saat Ini</button>
            </div>
          </div>

          {/* TIER 1: PRO */}
          <div className="bg-[#1A1A24] rounded-2xl p-6 border border-gray-800 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">PRO</h2>
            <p className="text-gray-400 text-sm mb-4">Untuk kreator konten pemula</p>
            <div className="text-4xl font-bold mb-2">Rp 35.000</div>
            <p className="text-gray-400 text-sm mb-6">100 token</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-2">✅ <span>100 token (Bisa untuk ±20 klip 720p)</span></li>
              <li className="flex gap-2">✅ <span>Maksimal 10 klip per generate</span></li>
              <li className="flex gap-2">✅ <span>Skor virality AI</span></li>
              <li className="flex gap-2">✅ <span>Format portrait 9:16</span></li>
              <li className="flex gap-2">✅ <span>Upload ke Cloudflare R2</span></li>
            </ul>
            
            <div className="space-y-3 mt-auto">
              <button onClick={() => handleCheckout('PRO', 'Midtrans')} className="w-full bg-[#8A2BE2] hover:bg-[#7A1BD2] text-white py-3 rounded-xl font-bold transition">Beli PRO</button>
              <button onClick={() => handleCheckout('PRO', 'Tripay')} className="w-full bg-[#2A2A35] hover:bg-[#3A3A45] text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">💳 Bayar via Tripay</button>
            </div>
          </div>

          {/* TIER 2: PRO PLUS (TERLARIS) */}
          <div className="bg-[#1A1A24] rounded-2xl p-6 border-2 border-[#8A2BE2] relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(138,43,226,0.15)] flex flex-col">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#8A2BE2] text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider">
              TERLARIS
            </div>
            <h2 className="text-2xl font-bold mb-1">PRO PLUS</h2>
            <p className="text-gray-400 text-sm mb-4">Lebih hemat 50% per token</p>
            <div className="text-4xl font-bold mb-2">Rp 75.000</div>
            <p className="text-gray-400 text-sm mb-6">500 token</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-2">✅ <span>500 token (Bisa untuk ±100 klip 720p)</span></li>
              <li className="flex gap-2">✅ <span>Maksimal 15 klip per generate</span></li>
              <li className="flex gap-2">✅ <span>Skor virality AI</span></li>
              <li className="flex gap-2">✅ <span>Format portrait 9:16</span></li>
              <li className="flex gap-2">✅ <span>Upload ke Cloudflare R2</span></li>
            </ul>
            
            <div className="space-y-3 mt-auto">
              <button onClick={() => handleCheckout('PRO_PLUS', 'Midtrans')} className="w-full bg-[#8A2BE2] hover:bg-[#7A1BD2] text-white py-3 rounded-xl font-bold transition">Beli PRO PLUS</button>
              <button onClick={() => handleCheckout('PRO_PLUS', 'Tripay')} className="w-full bg-[#2A2A35] hover:bg-[#3A3A45] text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">💳 Bayar via Tripay</button>
            </div>
          </div>

          {/* TIER 3: ENTERPRISE */}
          <div className="bg-[#1A1A24] rounded-2xl p-6 border border-gray-800 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">ENTERPRISE</h2>
            <p className="text-gray-400 text-sm mb-4">Untuk bisnis & power user</p>
            <div className="text-4xl font-bold mb-2">Rp 150.000</div>
            <p className="text-gray-400 text-sm mb-6">Unlimited</p>
            
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-2">✅ <span>Unlimited token</span></li>
              <li className="flex gap-2">✅ <span>Unlimited video generation</span></li>
              <li className="flex gap-2">✅ <span>Maksimal 20 klip per generate</span></li>
              <li className="flex gap-2">✅ <span>Skor virality AI</span></li>
              <li className="flex gap-2">✅ <span>Format portrait 9:16</span></li>
              <li className="flex gap-2">✅ <span>Upload ke Cloudflare R2</span></li>
            </ul>
            
            <div className="space-y-3 mt-auto">
              <button onClick={() => handleCheckout('ENTERPRISE', 'Midtrans')} className="w-full bg-transparent border border-[#8A2BE2] text-[#8A2BE2] hover:bg-[#8A2BE2] hover:text-white py-3 rounded-xl font-bold transition">Beli ENTERPRISE</button>
              <button onClick={() => handleCheckout('ENTERPRISE', 'Tripay')} className="w-full bg-[#2A2A35] hover:bg-[#3A3A45] text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">💳 Bayar via Tripay</button>
            </div>
          </div>

        </div>

        {/* TOMBOL MODAL TRANSPARANSI */}
        <div className="mt-12 text-center">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-gray-400 hover:text-white underline decoration-dashed underline-offset-4 flex items-center justify-center gap-2 mx-auto transition"
          >
            💡 Cara Kerja Token & Garansi
          </button>
        </div>

      </div>

      {/* MODAL POP-UP (UDAH DI-STYLE OUTLINE UNGU) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          {/* DIV DI BAWAH INI YANG DIUBAH BORDER DAN SHADOW-NYA */}
          <div className="bg-[#1A1A24] rounded-2xl p-6 md:p-8 max-w-2xl w-full border-2 border-[#8A2BE2] shadow-[0_0_40px_rgba(138,43,226,0.3)] relative my-8">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
            >
              &times;
            </button>
            
            <h3 className="text-2xl font-bold mb-6 border-b border-gray-700 pb-4">Detail Benefit & Sistem Token</h3>
            
            <div className="space-y-6 text-gray-300">
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-2">🛡 Garansi Token Kembali 100%</h4>
                <p className="text-sm leading-relaxed">Sistem AI kami punya fitur auto-refund. Jika proses generate klip gagal, error, atau terputus karena kendala server, token kamu tidak akan hangus dan langsung dikembalikan secara otomatis. Lo cuma bayar untuk hasil yang sukses!</p>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-2">⚙️ Simulasi Transparan (Pay for What You Use)</h4>
                <p className="text-sm leading-relaxed mb-3">Biaya generate dihitung berdasarkan beban server untuk memproses resolusi video. Semakin kecil resolusi, semakin hemat token kamu. Estimasi biaya per 1 klip:</p>
                <ul className="text-sm space-y-2 bg-[#0F0F13] p-4 rounded-xl border border-gray-800">
                  <li className="flex justify-between border-b border-gray-800 pb-2"><span>720p (Hemat & Cepat)</span> <span className="font-bold text-[#8A2BE2]">5 Token</span></li>
                  <li className="flex justify-between border-b border-gray-800 pb-2"><span>1080p (Kualitas Tinggi)</span> <span className="font-bold text-[#8A2BE2]">8 Token</span></li>
                  <li className="flex justify-between"><span>4K (Ultra HD)</span> <span className="font-bold text-[#8A2BE2]">15 Token</span></li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-2">💎 Benefit PRO Maksimal</h4>
                <p className="text-sm leading-relaxed">Langganan bulanan memastikan kamu selalu punya akses prioritas untuk upload hasil klip langsung ke Cloudflare R2 storage super cepat, fitur Skor Virality AI untuk analisis konten, dan format auto-portrait 9:16 yang dioptimasi untuk TikTok/Reels.</p>
              </div>
            </div>

            <button 
              onClick={() => setIsModalOpen(false)}
              className="w-full mt-8 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold transition"
            >
              Tutup Penjelasan
            </button>
          </div>
        </div>
      )}

    </div>
  );
}