import type { Metadata } from "next"
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import Providers from "@/components/Providers"
import Navbar from "@/components/Navbar"
import FeedbackFloating from "@/components/FeedbackFloating"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "ClipAI — Viral Clip Generator",
  description: "AI-powered TikTok/Shorts clip generator. Potong momen viral dari video YouTube dengan AI.",
  openGraph: {
    title: "ClipAI — Viral Clip Generator",
    description: "AI-powered TikTok/Shorts clip generator.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-zinc-950 text-zinc-100 font-sans">
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <FeedbackFloating />
        </Providers>
      </body>
    </html>
  )
}
