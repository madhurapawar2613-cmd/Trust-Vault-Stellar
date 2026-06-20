'use client'
import { TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface Stats {
  total: number
  active: number
  completed: number
  disputed: number
}

interface Props {
  stats: Stats
}

const STAT_ITEMS = [
  { key: 'total' as const, label: 'Total Escrows', icon: TrendingUp, color: 'var(--accent-primary)' },
  { key: 'active' as const, label: 'Active', icon: Clock, color: 'var(--accent-secondary)' },
  { key: 'completed' as const, label: 'Completed', icon: CheckCircle, color: '#818CF8' },
  { key: 'disputed' as const, label: 'Disputed', icon: AlertTriangle, color: 'var(--accent-warning)' },
]

export function StatsBar({ stats }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px',
    }}>
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.key}
            className="card"
            style={{ padding: '1.1rem 1.25rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Icon size={16} style={{ color: item.color }} />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {item.label}
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.875rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}>
              {stats[item.key]}
            </p>
          </div>
        )
      })}
    </div>
  )
}
