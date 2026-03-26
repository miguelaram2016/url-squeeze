import type { Metadata } from 'next'
import './globals.css'
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'URL Squeeze — Short links with honest analytics',
  description: 'Minimal URL shortener with QR codes and real click-event analytics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={cn("antialiased min-h-screen bg-background font-sans", inter.variable)}>
        {children}
      </body>
    </html>
  )
}
