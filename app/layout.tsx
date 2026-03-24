import type { Metadata } from 'next'
import { Space_Grotesk, Space_Mono, Inter, Orbitron } from 'next/font/google'
import { ToastProvider } from '@/components/ui/ToastProvider'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-heading',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
})

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--font-wordmark',
  display: 'swap',
  preload: false,
  fallback: ['sans-serif'],
})

export const metadata: Metadata = {
  title: 'Azmuth',
  description:
    'Understand how your students think — not just what they scored. AI-powered exam analysis for teachers.',
  icons: {
    icon: '/azmuth-logo.png',
    apple: '/azmuth-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable} ${inter.variable} ${orbitron.variable}`}>
      <body className="font-sans antialiased bg-[var(--color-background)] text-[#1A2B2B] min-h-screen">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
