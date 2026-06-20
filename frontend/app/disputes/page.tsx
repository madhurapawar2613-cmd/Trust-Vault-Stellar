'use client'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock, User, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useWallet } from '@/hooks/useWallet'
import { useEscrows } from '@/hooks/useEscrow'
import { shortenAddress, DISPUTE_STATUS_CONFIG, explorerContractUrl } from '@/lib/stellar'
import { ESCROW_CONTRACT_ID } from '@/lib/config'

export default function DisputesPage() {
  const { publicKey, isConnected } = useWallet()
  const { escrows, loading } = useEscrows(publicKey)

  const disputed = escrows.filter((e) => e.status === 'Disputed')

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'rgba(245,158,11,0.12)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent-warning)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700 }}>
            Disputes
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Disputed escrows undergo mediation via the Dispute Resolver contract.
        </p>
      </motion.div>

      {!isConnected ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Connect your wallet to view disputes.</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />
          ))}
        </div>
      ) : disputed.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card"
          style={{ padding: '4rem 2rem', textAlign: 'center' }}
        >
          <CheckCircle size={40} style={{ color: 'var(--accent-secondary)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
            No active disputes
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            All your escrows are dispute-free. Keep up the good work!
          </p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {disputed.map((escrow, idx) => {
            const isClient = escrow.client === publicKey
            return (
              <motion.div
                key={escrow.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className="card"
                style={{ padding: '1.25rem 1.5rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '40px', height: '40px',
                      background: 'rgba(245,158,11,0.1)',
                      borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <AlertTriangle size={18} style={{ color: 'var(--accent-warning)' }} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem' }}>
                          Escrow #{escrow.id}
                        </span>
                        <div className="badge" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--accent-warning)', fontSize: '0.7rem' }}>
                          <span className="status-pulse-warning" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-warning)', display: 'inline-block' }} />
                          Disputed
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <User size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {isClient ? 'You (Client) ↔ ' : 'You (Freelancer) ↔ '}
                          </span>
                          <span className="address" style={{ fontSize: '0.68rem' }}>
                            {shortenAddress(isClient ? escrow.freelancer : escrow.client, 5)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Awaiting mediator
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <a
                      href={explorerContractUrl(ESCROW_CONTRACT_ID)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '6px' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                    <Link href={`/escrow/${escrow.id}`} style={{ textDecoration: 'none' }}>
                      <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                        View Details
                      </button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Info panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card"
        style={{ padding: '1.25rem 1.5rem', marginTop: '2rem', borderColor: 'rgba(99,102,241,0.25)' }}
      >
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '8px', color: 'var(--accent-primary)' }}>
          How dispute resolution works
        </h3>
        <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.825rem', lineHeight: 1.75 }}>
          <li>Either party raises a dispute — escrow is frozen immediately.</li>
          <li>The Dispute Resolver contract records the claim on-chain.</li>
          <li>A designated mediator reviews evidence off-chain and resolves the dispute.</li>
          <li>Resolution is recorded on-chain and funds are distributed accordingly.</li>
        </ol>
      </motion.div>
    </div>
  )
}
