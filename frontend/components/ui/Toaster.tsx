'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useTrustVaultStore } from '@/lib/store'
import { X, CheckCircle, AlertTriangle, Info, Loader2, ExternalLink } from 'lucide-react'
import { explorerTxUrl } from '@/lib/stellar'

const ICONS = {
  success: <CheckCircle size={18} style={{ color: '#10B981' }} />,
  error: <AlertTriangle size={18} style={{ color: '#EF4444' }} />,
  pending: <Loader2 size={18} style={{ color: '#6366F1', animation: 'spin 1s linear infinite' }} />,
  info: <Info size={18} style={{ color: '#6366F1' }} />,
}

const ACCENT_COLORS = {
  success: '#10B981',
  error: '#EF4444',
  pending: '#6366F1',
  info: '#6366F1',
}

export function Toaster() {
  const { toasts, removeToast } = useTrustVaultStore()

  return (
    <div className="toast-root">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid var(--border)`,
              borderLeft: `3px solid ${ACCENT_COLORS[toast.type]}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ flexShrink: 0, paddingTop: '1px' }}>{ICONS[toast.type]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
                marginBottom: toast.message ? '3px' : 0,
              }}>
                {toast.title}
              </p>
              {toast.message && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {toast.message}
                </p>
              )}
              {toast.txHash && (
                <a
                  href={explorerTxUrl(toast.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--accent-primary)',
                    textDecoration: 'none',
                    marginTop: '4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  View on Explorer <ExternalLink size={11} />
                </a>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '2px',
                flexShrink: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
