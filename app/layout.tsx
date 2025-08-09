import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Castra - AI Co-Pilot for Real Estate',
  description: 'Castra drafts emails in your tone, schedules meetings, updates your CRM, preps MLS content—so you can focus on clients.',
  keywords: 'real estate, AI, CRM, email automation, scheduling, MLS',
  openGraph: {
    title: 'Castra - AI Co-Pilot for Real Estate',
    description: 'The magical co-pilot for real estate professionals.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground transition-colors duration-300`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
