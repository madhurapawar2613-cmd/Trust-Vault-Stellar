'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ExternalLink, AlertTriangle, XCircle, CheckCircle,
  Clock, User, Loader2, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { MilestoneTracker } from '@/components/MilestoneTracker'
import { DisputeModal } from '@/components/DisputeModal'
import { useEscrow } from '@/hooks/useEscrow'
import { useWallet } from '@/hooks/useWallet'
import { useEscrowEvents } from '@/hooks/useEvents'
import {
  completeMilestone, approveMilestone,
  raiseDispute, cancelEscrow
} from '@/lib/contracts'
import {
  formatXLM, shortenAddress,
  STATUS_CONFIG, explorerContractUrl
} from '@/lib/stellar'
import { useTrustVaultStore } from '@/lib/store'
import { ESCROW_CONTRACT_ID } from '@/lib/config'

export default function EscrowDetail() {
  const { id } = useParams<{ id: string }>()
  const escrowId = parseInt(id, 10)
  const { publicKey, signTransaction } = useWallet()
  const { escrow, loading, error, refetch } = useEscrow(escrowId)
  const { addToast } = useTrustVaultStore()

  const [loadingMilestoneId, setLoadingMilestoneId] = useState<number | null>(null)
  const [showDispute, setShowDispute] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Live event streaming
  useEscrowEvents(escrowId, () => { refetch() })

  const userRole: 'client' | 'freelancer' | 'observer' =
    escrow?.client === publicKey ? 'client' :
    escrow?.freelancer === publicKey ? 'freelancer' : 'observer'

  const config = escrow ? STATUS_CONFIG[escrow.status] ?? STATUS_CONFIG.Active : null
  const progress = escrow
    ? escrow.milestones.filter((m) => m.approved).length / Math.max(escrow.milestones.length, 1) * 100
    : 0

  async function handleComplete(milestoneId: number) {
    if (!publicKey || !signTransaction) return
    setLoadingMilestoneId(milestoneId)
    try {
      const hash = await completeMilestone({ freelancer: publicKey, escrowId, milestoneId, signTransaction })
      addToast({ type: 'success', title: 'Milestone marked complete', message: 'Waiting for client approval.', txHash: hash })
      await refetch()
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoadingMilestoneId(null)
    }
  }

  async function handleApprove(milestoneId: number) {
    if (!publicKey || !signTransaction) return
    setLoadingMilestoneId(milestoneId)
    try {
      const hash = await approveMilestone({ client: publicKey, escrowId, milestoneId, signTransaction })
      addToast({ type: 'success', title: 'Milestone approved', message: 'Funds released to freelancer.', txHash: hash })
      await refetch()
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoadingMilestoneId(null)
    }
  }

  async function handleDispute(reason: string) {
    if (!publicKey || !signTransaction) throw new Error('Not connected')
    const hash = await raiseDispute({ caller: publicKey, escrowId, reason, signTransaction })
    addToast({ type: 'error', title: 'Dispute raised', message: 'Mediator has been notified.', txHash: hash, duration: 10000 })
    await refetch()
  }

  async function handleCancel() {
    if (!publicKey || !signTransaction) return
    setCancelLoading(true)
    try {
      const hash = await cancelEscrow({ client: publicKey, escrowId, signTransaction })
      addToast({ type: 'info', title: 'Escrow cancelled', message: 'Funds refunded to your wallet.', txHash: hash })
      await refetch()
    } catch (e: unknown) {
      addToast({ type: 'error', title: 'Cancel failed', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="skeleton" style={{ height: '340px', borderRadius: '16px', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '200px', borderRadius: '16px' }} />
      </div>
    )
  }

  if (error || !escrow) {
    return (
      <div style={{ maxWidth: '760px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-danger)', marginBottom: '1rem' }}>{error ?? 'Escrow not found'}</p>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <button className="btn btn-outline"><ArrowLeft size={14} /> Back to Dashboard</button>
        </Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Back nav */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-display)' }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
        style={{ padding: '1.75rem', marginBottom: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Escrow #{escrow.id}
              </span>
              <a
                href={explorerContractUrl(ESCROW_CONTRACT_ID)}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}
              >
                <ExternalLink size={12} />
              </a>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 700, lineHeight: 1 }}>
              {formatXLM(escrow.total_amount)}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {formatXLM(escrow.released_amount)} released
            </p>
          </div>

          {config && (
            <div className="badge" style={{ background: config.bg, color: config.color }}>
              {config.pulse ? (
                <span className="status-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color, display: 'inline-block' }} />
              ) : (
                <CheckCircle size={13} />
              )}
              {config.label}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
              Overall Progress
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Client', addr: escrow.client, isYou: userRole === 'client' },
            { label: 'Freelancer', addr: escrow.freelancer, isYou: userRole === 'freelancer' },
          ].map((p) => (
            <div key={p.label} className="card-elevated" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <User size={13} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {p.label} {p.isYou && '(You)'}
                </span>
              </div>
              <span className="address" style={{ fontSize: '0.7rem' }}>{shortenAddress(p.addr, 6)}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Milestones */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="card"
        style={{ padding: '1.75rem', marginBottom: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem' }}>
            Milestones
          </h2>
          <button
            className="btn-ghost"
            style={{ gap: '6px', fontSize: '0.78rem', display: 'flex', alignItems: 'center' }}
            onClick={refetch}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <MilestoneTracker
          milestones={escrow.milestones}
          userRole={userRole === 'observer' ? 'client' : userRole}
          escrowStatus={escrow.status}
          onComplete={handleComplete}
          onApprove={handleApprove}
          loadingId={loadingMilestoneId}
        />
      </motion.div>

      {/* Action buttons */}
      {escrow.status === 'Active' && userRole !== 'observer' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
        >
          <button
            className="btn btn-warning"
            style={{ gap: '8px' }}
            onClick={() => setShowDispute(true)}
          >
            <AlertTriangle size={14} /> Raise Dispute
          </button>
          {userRole === 'client' && (
            <button
              className="btn btn-outline"
              style={{ gap: '8px' }}
              onClick={handleCancel}
              disabled={cancelLoading}
            >
              {cancelLoading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cancelling...</>
                : <><XCircle size={14} /> Cancel Escrow</>}
            </button>
          )}
        </motion.div>
      )}

      {/* Dispute modal */}
      {showDispute && (
        <DisputeModal
          escrowId={escrowId}
          onConfirm={handleDispute}
          onClose={() => setShowDispute(false)}
        />
      )}
    </div>
  )
}
