'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, AlertTriangle, XCircle, ChevronRight } from 'lucide-react'
import { formatXLM, shortenAddress, STATUS_CONFIG, type EscrowData } from '@/lib/stellar'

interface Props {
  escrow: EscrowData
  userPublicKey: string
}

export function EscrowCard({ escrow, userPublicKey }: Props) {
  const isClient = escrow.client === userPublicKey
  const config = STATUS_CONFIG[escrow.status] ?? STATUS_CONFIG.Active

  const approvedCount = escrow.milestones?.filter((m) => m.approved).length ?? 0
  const totalCount = escrow.milestones?.length ?? 0
  const progress = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0

  const StatusIcons = {
    Active: Clock,
    Completed: CheckCircle,
    Disputed: AlertTriangle,
    Cancelled: XCircle,
  }
  const StatusIcon = StatusIcons[escrow.status] ?? Clock

  return (
    <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
      <Link href={`/escrow/${escrow.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <div
          className="card"
          style={{
            padding: '1.25rem',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
            cursor: 'pointer',
          }}
        >
          {/* Top row: role + status badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                marginBottom: '5px',
              }}>
                {isClient ? 'Client → You hired' : 'Freelancer → Working for'}
              </p>
              <span className="address">
                {shortenAddress(isClient ? escrow.freelancer : escrow.client, 5)}
              </span>
            </div>

            {/* Status badge */}
            <div
              className="badge"
              style={{
                background: config.bg,
                color: config.color,
                flexShrink: 0,
              }}
            >
              {config.pulse ? (
                <span
                  className={escrow.status === 'Disputed' ? 'status-pulse-warning' : 'status-pulse'}
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: config.color,
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <StatusIcon size={12} />
              )}
              {config.label}
            </div>
          </div>

          {/* Amount */}
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.625rem',
              fontWeight: 700,
              lineHeight: 1,
              marginBottom: '4px',
              color: 'var(--text-primary)',
            }}>
              {formatXLM(escrow.total_amount)}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
              {formatXLM(escrow.released_amount)} released
            </p>
          </div>

          {/* Milestone progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
              <span style={{
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
              }}>
                Milestones
              </span>
              <span style={{
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
              }}>
                {approvedCount}/{totalCount}
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '-4px',
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              #{escrow.id}
            </span>
            <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
