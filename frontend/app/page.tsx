'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, Shield, Zap, Lock, ArrowRight, RefreshCw, Loader2 } from 'lucide-react'
import { EscrowCard } from '@/components/EscrowCard'
import { WalletConnect } from '@/components/WalletConnect'
import { StatsBar } from '@/components/StatsBar'
import { useWallet } from '@/hooks/useWallet'
import { useEscrows } from '@/hooks/useEscrow'

const FEATURES = [
  {
    icon: Lock,
    title: 'Funds locked on-chain',
    description: 'Smart contract holds funds — neither party can run off with the money.',
  },
  {
    icon: Zap,
    title: 'Instant milestone releases',
    description: 'Once a milestone is approved, funds hit the freelancer\'s wallet automatically.',
  },
  {
    icon: Shield,
    title: 'Dispute resolution',
    description: 'Raise a dispute and a mediator contract reviews the case transparently.',
  },
]

export default function Dashboard() {
  const { publicKey, isConnected } = useWallet()
  const { escrows, loading, refetch } = useEscrows(publicKey)

  const stats = {
    total: escrows.length,
    active: escrows.filter((e) => e.status === 'Active').length,
    completed: escrows.filter((e) => e.status === 'Completed').length,
    disputed: escrows.filter((e) => e.status === 'Disputed').length,
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Landing Hero (not connected) ─────────────────────────────────── */}
      {!isConnected && (
        <section style={{ position: 'relative', overflow: 'hidden', padding: '5rem 1.5rem 4rem', textAlign: 'center' }}>
          {/* Grid background */}
          <div
            className="hero-grid"
            style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none' }}
          />

          {/* Radial glow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -60%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Vault SVG — signature element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}
          >
            <div className="vault-glow" style={{ position: 'relative', width: '100px', height: '100px' }}>
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer ring (slow spin) */}
                <circle className="vault-spin" cx="50" cy="50" r="46" stroke="#6366F1" strokeWidth="1" strokeDasharray="8 4" opacity="0.3" />
                {/* Main body */}
                <rect x="12" y="12" width="76" height="76" rx="14" stroke="#6366F1" strokeWidth="1.5" />
                {/* Inner dial */}
                <circle cx="50" cy="50" r="22" stroke="#6366F1" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="9" fill="#6366F1" opacity="0.7" />
                {/* Tick marks */}
                <line x1="50" y1="28" x2="50" y2="34" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                <line x1="50" y1="66" x2="50" y2="72" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                <line x1="28" y1="50" x2="34" y2="50" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                <line x1="66" y1="50" x2="72" y2="50" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                {/* Handle */}
                <rect x="79" y="42" width="11" height="16" rx="5" fill="#6366F1" opacity="0.5" />
              </svg>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              marginBottom: '1.25rem',
              maxWidth: '680px',
              margin: '0 auto 1.25rem',
            }}
          >
            Escrow without{' '}
            <span style={{ color: 'var(--accent-primary)' }}>middlemen.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.075rem',
              maxWidth: '540px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
            }}
          >
            TrustVault locks funds in a Soroban smart contract. Money moves only when milestones are met — no intermediaries, no surprises.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.44, duration: 0.45 }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '4rem' }}
          >
            <WalletConnect large />
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
              maxWidth: '820px',
              margin: '0 auto',
            }}
          >
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="card" style={{ padding: '1.5rem', textAlign: 'left' }}>
                  <div style={{
                    width: '40px', height: '40px',
                    background: 'rgba(99,102,241,0.12)',
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem',
                  }}>
                    <Icon size={20} style={{ color: 'var(--accent-primary)' }} />
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    marginBottom: '6px',
                  }}>
                    {f.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {f.description}
                  </p>
                </div>
              )
            })}
          </motion.div>
        </section>
      )}

      {/* ── Connected Dashboard ──────────────────────────────────────────── */}
      {isConnected && publicKey && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
          {/* Welcome row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '1.75rem' }}
          >
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '4px',
            }}>
              Dashboard
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Welcome back. Here are all your escrow agreements.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
            <StatsBar stats={stats} />
          </motion.div>

          {/* Header row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '2rem 0 1.25rem',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600 }}>
              Your Escrows
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-outline" 
                onClick={refetch} 
                disabled={loading}
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', gap: '6px' }}
              >
                {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />} 
                Refresh
              </button>
              <Link href="/create" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  <Plus size={15} /> New Escrow
                </button>
              </Link>
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: '210px', borderRadius: '16px' }} />
              ))}
            </div>
          ) : escrows.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card"
              style={{ padding: '4rem 2rem', textAlign: 'center' }}
            >
              <div style={{
                width: '60px', height: '60px',
                background: 'var(--bg-elevated)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <Shield size={28} style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
                No escrows yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '320px', margin: '0 auto 1.5rem' }}>
                Create your first escrow to start working with clients and freelancers securely on-chain.
              </p>
              <Link href="/create" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary">
                  <Plus size={15} /> Create your first escrow <ArrowRight size={15} />
                </button>
              </Link>
            </motion.div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {escrows.map((escrow, idx) => (
                <motion.div
                  key={escrow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                >
                  <EscrowCard escrow={escrow} userPublicKey={publicKey} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
