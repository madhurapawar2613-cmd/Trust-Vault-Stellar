'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Loader2 } from 'lucide-react'

interface Props {
  escrowId: number
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}

export function DisputeModal({ escrowId, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim() || reason.length < 20) {
      setError('Please provide a detailed reason (at least 20 characters).')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to raise dispute')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'rgba(245,158,11,0.12)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={18} style={{ color: 'var(--accent-warning)' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                  Raise a Dispute
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
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '1.25rem',
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--accent-warning)', lineHeight: 1.5 }}>
              ⚠️ This will freeze the escrow and notify both parties. A mediator will review the dispute. This action cannot be undone.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" htmlFor="dispute-reason">
                Reason for dispute
              </label>
              <textarea
                id="dispute-reason"
                className={`input ${error ? 'error' : ''}`}
                placeholder="Describe clearly why you are raising this dispute. Include relevant dates, deliverables, and communication failures..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(null) }}
                rows={5}
                disabled={loading}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                {error ? (
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-danger)' }}>{error}</p>
                ) : <span />}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {reason.length}/500
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-warning"
                disabled={loading || reason.length < 20}
              >
                {loading ? (
                  <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                ) : (
                  <><AlertTriangle size={15} /> Raise Dispute</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
