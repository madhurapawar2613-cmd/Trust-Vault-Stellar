'use client'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Clock, DollarSign } from 'lucide-react'
import { formatXLM, type MilestoneData } from '@/lib/stellar'

interface Props {
  milestones: MilestoneData[]
  userRole: 'client' | 'freelancer'
  escrowStatus: string
  onComplete?: (milestoneId: number) => void
  onApprove?: (milestoneId: number) => void
  loadingId?: number | null
}

export function MilestoneTracker({
  milestones,
  userRole,
  escrowStatus,
  onComplete,
  onApprove,
  loadingId,
}: Props) {
  const isActive = escrowStatus === 'Active'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {milestones.map((m, idx) => {
        const isLoading = loadingId === m.id
        const canComplete = userRole === 'freelancer' && !m.completed && isActive
        const canApprove = userRole === 'client' && m.completed && !m.approved && isActive

        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.07 }}
            className="card-elevated"
            style={{ padding: '1rem 1.25rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              {/* State icon */}
              <div style={{ marginTop: '2px', flexShrink: 0 }}>
                {m.approved ? (
                  <CheckCircle size={20} style={{ color: 'var(--accent-secondary)' }} />
                ) : m.completed ? (
                  <Clock size={20} style={{ color: 'var(--accent-warning)' }} />
                ) : (
                  <Circle size={20} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: m.approved ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: m.approved ? 'line-through' : 'none',
                      marginBottom: '4px',
                    }}>
                      {m.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <DollarSign size={12} style={{ color: 'var(--accent-secondary)' }} />
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: 'var(--accent-secondary)',
                        fontWeight: 500,
                      }}>
                        {formatXLM(m.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {canComplete && (
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '5px 14px' }}
                        onClick={() => onComplete?.(m.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? '…' : 'Mark Done'}
                      </button>
                    )}
                    {canApprove && (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '5px 14px' }}
                        onClick={() => onApprove?.(m.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? '…' : '✓ Approve & Pay'}
                      </button>
                    )}
                    {m.approved && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--accent-secondary)',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        padding: '5px 0',
                      }}>
                        Paid ✓
                      </span>
                    )}
                    {m.completed && !m.approved && userRole !== 'client' && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--accent-warning)',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        padding: '5px 0',
                      }}>
                        Awaiting approval
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
