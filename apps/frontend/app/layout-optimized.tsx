import type { Metadata, Viewport } from 'next'
import dynamic from 'next/dynamic'
import './globals.css'

// Lazy load providers to reduce initial bundle
const Providers = dynamic(
  () => import('@/components/providers-optimized').then(mod => ({ default: mod.Providers })),
  { ssr: false }
)

// Optimize metadata for SEO and performance
export const metadata: Metadata = {
  title: 'Study Teddy - AI Study Planner',
  description: 'AI-powered study planner and assistant',
  applicationName: 'Study Teddy',
  keywords: ['study', 'planner', 'AI', 'education'],
  authors: [{ name: 'Study Teddy Team' }],
  creator: 'Study Teddy',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Study Teddy',
    description: 'AI-powered study planner',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

// Minimal root layout for fastest initial load
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}