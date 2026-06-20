import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/WalletProvider'
import { Toaster } from '@/components/ui/Toaster'
import { Navbar } from '@/components/Navbar'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TrustVault — Decentralized Escrow on Stellar',
  description:
    'Secure, transparent, milestone-based escrow powered by Soroban smart contracts. No middlemen. No surprises.',
  keywords: ['Stellar', 'Soroban', 'escrow', 'DeFi', 'blockchain', 'freelance', 'smart contracts'],
  authors: [{ name: 'TrustVault' }],
  openGraph: {
    title: 'TrustVault — Decentralized Escrow on Stellar',
    description: 'Secure milestone-based escrow powered by Soroban smart contracts.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TrustVault — Decentralized Escrow',
    description: 'Trustless escrow for the global freelance economy.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <WalletProvider>
          <Navbar />
          <main>{children}</main>
          <Toaster />
        </WalletProvider>
      </body>
    </html>
  )
}
