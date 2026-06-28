'use client'
import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { Wallet, LogOut, Loader2 } from 'lucide-react'
import { shortenAddress } from '@/lib/stellar'

interface Props {
  large?: boolean
}

export function WalletConnect({ large }: Props) {
  const { publicKey, isConnected, loading, error, connect, disconnect, freighterInstalled } = useWallet()
  const [hovered, setHovered] = useState(false)

  if (isConnected && publicKey) {
    return (
      <button
        className="btn btn-outline"
        onClick={disconnect}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          gap: '8px',
          fontSize: '0.8rem',
          padding: large ? '0.7rem 1.4rem' : '0.5rem 1rem',
          borderColor: hovered ? 'var(--accent-danger)' : 'var(--border)',
          color: hovered ? 'var(--accent-danger)' : 'var(--text-secondary)',
          background: hovered ? 'rgba(236,72,153,0.08)' : 'var(--bg-elevated)',
          transition: 'all 0.25s ease',
          width: large ? '180px' : '140px',
          justifyContent: 'center',
        }}
      >
        {hovered ? (
          <>
            <LogOut size={13} />
            Disconnect
          </>
        ) : (
          <>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent-secondary)',
              boxShadow: '0 0 8px var(--accent-secondary)'
            }} />
            {shortenAddress(publicKey, 4)}
          </>
        )}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <button
        className="btn btn-primary"
        onClick={connect}
        disabled={loading}
        style={{
          fontSize: large ? '1rem' : '0.875rem',
          padding: large ? '0.75rem 2rem' : '0.5rem 1.25rem',
          gap: '8px',
        }}
      >
        {loading ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Wallet size={16} />
        )}
        {loading ? 'Connecting...' : 'Connect Freighter'}
      </button>
      {error && (
        <p style={{ fontSize: '0.78rem', color: 'var(--accent-danger)', maxWidth: '280px', textAlign: 'center' }}>
          {error}
        </p>
      )}
      {!freighterInstalled && !loading && (
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}
        >
          Get Freighter Wallet →
        </a>
      )}
    </div>
  )
}
