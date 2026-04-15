import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Audible — Read & Listen',
  description: 'Prototype: scroll-to-seek for Audible Read & Listen'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans h-screen bg-black text-neutral-200">
        <div className="h-screen flex items-start justify-center">
          {/* Mobile frame */}
          <div className="relative w-full max-w-[390px] h-screen bg-ink overflow-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
