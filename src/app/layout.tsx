import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Simulation Goal to Parameters',
  description: 'Convert business simulation goals to relevant parameters',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}