'use client';
import { useState } from 'react';

export default function Navbar() {
  // State untuk buka/tutup menu di HP
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* LOGO (Kiri) */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-wider flex items-center gap-1">
              ✂️ Clip<span className="text-purple-500">AI</span>
            </span>
          </div>

          {/* MENU DESKTOP (Hanya muncul di PC / Layar Besar) */}
          <div className="hidden md:flex items-center gap-6">
            <a href="/pricing" className="text-sm text-gray-300 hover:text-white transition">Pricing</a>
            <a href="/dashboard" className="text-sm text-gray-300 hover:text-white transition">Dashboard</a>
            <a href="/feedback" className="text-sm text-gray-300 hover:text-white transition">Feedback</a>
            
            {/* Info User PC */}
            <div className="flex items-center gap-2 bg-white/5 pl-3 pr-1 py-1 rounded-full border border-white/10">
              <span className="text-xs text-gray-400">jenalsosmed@gmail.com</span>
              <span className="bg-purple-600 text-[10px] font-bold px-2 py-1 rounded-full">OWNER</span>
            </div>
          </div>

          {/* TOMBOL HAMBURGER (Hanya muncul di HP / Layar Kecil) */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* MENU DROPDOWN HP (Hanya muncul di HP pas diklik) */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:hidden bg-black/90 border-b border-white/10 animate-fade-in`}>
        <div className="px-2 pt-2 pb-4 space-y-2 sm:px-3 text-center">
          <a href="/pricing" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white">Pricing</a>
          <a href="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white">Dashboard</a>
          <a href="/feedback" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white">Feedback</a>
          
          <div className="border-t border-white/10 pt-3 mt-2">
            <p className="text-xs text-gray-400">jenalsosmed@gmail.com</p>
            <span className="inline-block bg-purple-600 text-[10px] font-bold px-3 py-1 rounded-full mt-1">
              OWNER (FREE)
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
