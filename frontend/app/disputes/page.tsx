'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle, Clock, User, ExternalLink, Gavel, X, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useWallet } from '@/hooks/useWallet'
import { useEscrows } from '@/hooks/useEscrow'
import { shortenAddress, explorerContractUrl } from '@/lib/stellar'
import { ESCROW_CONTRACT_ID } from '@/lib/config'
import { resolveDispute } from '@/lib/contracts'
import { useTrustVaultStore } from '@/lib/store'

// ── Resolve Modal ─────────────────────────────────────────────────────────────
function ResolveModal({
  escrowId,
  clientAddress,
  freelancerAddress,
  onClose,
  onResolved,
}: {
  escrowId: number
  clientAddress: string
  freelancerAddress: string
  onClose: () => void
  onResolved: () => void
}) {
  const { publicKey, signTransaction } = useWallet()
  const { addToast } = useTrustVaultStore()
  const [winner, setWinner] = useState<'client' | 'freelancer' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleResolve() {
    if (!winner || !publicKey || !signTransaction) return
    setLoading(true)
    setError(null)
    try {
      const hash = await resolveDispute({
        admin: publicKey,
        escrowId,
        winner,
        signTransaction,
      })
      addToast({
        type: 'success',
        title: 'Dispute Resolved',
        message: `Resolved in favour of ${winner}. Funds distributed.`,
        txHash: hash,
      })
      onResolved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to resolve dispute')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'rgba(99,102,241,0.12)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Gavel size={18} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                Resolve Dispute
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Escrow #{escrowId}
              </p>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="divider" />

        {/* Warning */}
        <div style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: '1.25rem',
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            ⚖️ As mediator, select the winning party. Funds will be distributed on-chain immediately. This action is <strong style={{ color: 'var(--text-primary)' }}>irreversible</strong>.
          </p>
        </div>

        {/* Party selector */}
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          Select winning party
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
          {[
            { key: 'client' as const, label: 'Client', addr: clientAddress },
            { key: 'freelancer' as const, label: 'Freelancer', addr: freelancerAddress },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setWinner(p.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${winner === p.key ? 'var(--accent-primary)' : 'var(--border)'}`,
                background: winner === p.key ? 'rgba(99,102,241,0.08)' : 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px',
                  borderRadius: '50%',
                  background: winner === p.key ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${winner === p.key ? 'var(--accent-primary)' : 'var(--border)'}`,
                }}>
                  <User size={14} style={{ color: winner === p.key ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.875rem', color: winner === p.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {p.label}
                  </p>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {shortenAddress(p.addr, 6)}
                  </span>
                </div>
              </div>
              {winner === p.key && (
                <div style={{
                  width: '20px', height: '20px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle size={13} style={{ color: '#fff' }} />
                </div>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p style={{ fontSize: '0.78rem', color: 'var(--accent-danger)', marginBottom: '1rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!winner || loading}
            onClick={handleResolve}
            style={{ gap: '8px' }}
          >
            {loading ? (
              <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Resolving…</>
            ) : (
              <><Gavel size={15} /> Resolve Dispute</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Disputes Page ────────────────────────────────────────────────────────
export default function DisputesPage() {
  const { publicKey, isConnected } = useWallet()
  const { escrows, loading, refetch } = useEscrows(publicKey)
  const [resolveTarget, setResolveTarget] = useState<{ id: number; client: string; freelancer: string } | null>(null)

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
            <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '16px' }} />
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

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={explorerContractUrl(ESCROW_CONTRACT_ID)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '6px' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                    {/* Mediator: Resolve button */}
                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '6px 14px', gap: '6px', borderColor: 'rgba(99,102,241,0.4)', color: 'var(--accent-primary)' }}
                      onClick={() => setResolveTarget({ id: escrow.id, client: escrow.client, freelancer: escrow.freelancer })}
                    >
                      <Gavel size={13} /> Resolve
                    </button>
                    <Link href={`/escrow/${escrow.id}`} style={{ textDecoration: 'none' }}>
                      <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 14px', gap: '6px' }}>
                        View Details <ArrowRight size={13} />
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
          <li>A designated mediator reviews evidence off-chain and clicks <strong style={{ color: 'var(--text-primary)' }}>Resolve</strong>.</li>
          <li>Resolution is recorded on-chain and funds are distributed accordingly.</li>
        </ol>
      </motion.div>

      {/* Resolve Modal */}
      <AnimatePresence>
        {resolveTarget && (
          <ResolveModal
            escrowId={resolveTarget.id}
            clientAddress={resolveTarget.client}
            freelancerAddress={resolveTarget.freelancer}
            onClose={() => setResolveTarget(null)}
            onResolved={refetch}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
