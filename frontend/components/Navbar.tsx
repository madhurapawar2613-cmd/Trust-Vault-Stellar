'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, LayoutDashboard, PlusCircle, AlertTriangle, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { WalletConnect } from './WalletConnect'
import { useWallet } from '@/hooks/useWallet'
import { shortenAddress } from '@/lib/stellar'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/create', label: 'New Escrow', icon: PlusCircle },
  { href: '/disputes', label: 'Disputes', icon: AlertTriangle },
]

export function Navbar() {
  const pathname = usePathname()
  const { publicKey, isConnected } = useWallet()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(10,11,15,0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <nav style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1.5rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div className="vault-glow">
            <Shield size={26} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            TrustVault
          </span>
        </Link>

        {/* Desktop nav */}
        {isConnected && (
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href
              return (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none', position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                  }}>
                    <link.icon size={15} />
                    {link.label}
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          left: '14px',
                          right: '14px',
                          height: '2px',
                          background: 'var(--accent-primary)',
                          borderRadius: '1px',
                        }}
                      />
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isConnected && publicKey && (
            <div className="hide-mobile address" style={{ fontSize: '0.7rem' }}>
              {shortenAddress(publicKey, 5)}
            </div>
          )}
          <WalletConnect />
          {/* Mobile hamburger */}
          <button
            className="btn-ghost show-mobile"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && isConnected && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          style={{
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            padding: '0.75rem 1.5rem 1rem',
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 0',
                color: pathname === link.href ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                textDecoration: 'none',
                borderBottom: '1px solid var(--border)',
                fontSize: '0.9rem',
              }}
            >
              <link.icon size={16} />
              {link.label}
            </Link>
          ))}
        </motion.div>
      )}
    </header>
  )
}
