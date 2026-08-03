import type { Metadata } from 'next'
import { Baloo_2, Atkinson_Hyperlegible } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

// Display face: chunky + rounded for headings, numbers, buttons.
const display = Baloo_2({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
})

// Body face: Atkinson Hyperlegible (Braille Institute) — maximum character
// disambiguation for young and striving readers. Latin-ext covers Spanish
// and Haitian Creole gloss text.
const body = Atkinson_Hyperlegible({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'My Civics Class: Build the Republic',
  description: 'Florida 7th Grade Civics Mastery Learning Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="font-sans text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
