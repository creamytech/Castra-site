import './globals.css'
import type { Metadata } from 'next'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Castra - Realtor AI Co-Pilot',
  description: 'Join the waitlist for Castra, your AI-powered realtor assistant.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
