'use client'
import { useWallet } from '@/hooks/useWallet'
import { Wallet, LogOut, Loader2 } from 'lucide-react'

interface Props {
  large?: boolean
}

export function WalletConnect({ large }: Props) {
  const { isConnected, loading, error, connect, disconnect, freighterInstalled } = useWallet()

  if (isConnected) {
    return (
      <button
        className="btn btn-outline"
        onClick={disconnect}
        style={{ gap: '7px', fontSize: '0.8rem', padding: large ? '0.7rem 1.4rem' : '0.5rem 1rem' }}
      >
        <LogOut size={14} />
        Disconnect
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
