'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session, status } = useSession();
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      const isInsideButton = menuRef.current?.contains(target)
      const isInsidePanel = panelRef.current?.contains(target)
      if (!isInsideButton && !isInsidePanel) setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <nav className="w-full sticky top-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-wider flex items-center gap-1">✂️ Clip<span className="text-purple-500">AI</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/clipper" className="text-sm text-gray-300 hover:text-white transition">Clipper</Link>
            <Link href="/pricing" className="text-sm text-gray-300 hover:text-white transition">Pricing</Link>
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white transition">Dashboard</Link>
            {status === 'authenticated' && session?.user ? (
              <div className="flex items-center gap-2 bg-white/5 pl-3 pr-1 py-1 rounded-full border border-white/10">
                <span className="text-xs text-gray-400">{session.user.email}</span>
                {session.user.email === 'jenalsosmed@gmail.com' && <span className="bg-purple-600 text-[10px] font-bold px-2 py-1 rounded-full">OWNER</span>}
                <button onClick={() => signOut({ callbackUrl: '/' })} className="text-[10px] text-gray-500 hover:text-red-400 ml-1 transition">✕</button>
              </div>
            ) : (
              <Link href="/auth" className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-full transition">Login</Link>
            )}
          </div>
          <div className="flex md:hidden" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 focus:outline-none active:scale-95 transition-transform relative z-[60]" aria-label="Toggle menu">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden animate-fade-in" onClick={() => setIsOpen(false)} />}
      {isOpen && (
        <div key="mobile-menu" ref={panelRef} className="md:hidden bg-zinc-900/95 border-b border-white/10 fixed top-16 left-0 right-0 z-50 animate-slide-down">
          <div className="px-2 pt-2 pb-4 space-y-2 sm:px-3 text-center">
            <Link href="/clipper" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)}>Clipper</Link>
            <Link href="/pricing" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)}>Pricing</Link>
            <Link href="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-white/10 hover:text-white" onClick={() => setIsOpen(false)}>Dashboard</Link>
            <div className="border-t border-white/10 pt-3 mt-2">
              {status === 'authenticated' && session?.user ? (
                <>
                  <p className="text-xs text-gray-400">{session.user.email}</p>
                  {session.user.email === 'jenalsosmed@gmail.com' && <span className="inline-block bg-purple-600 text-[10px] font-bold px-3 py-1 rounded-full mt-1">OWNER</span>}
                  <button onClick={() => { setIsOpen(false); signOut({ callbackUrl: '/' }) }} className="block mx-auto mt-2 text-xs text-red-400 hover:text-red-300 transition">Logout</button>
                </>
              ) : (
                <Link href="/auth" className="block mx-auto w-fit text-sm bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full transition" onClick={() => setIsOpen(false)}>Login / Daftar</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
