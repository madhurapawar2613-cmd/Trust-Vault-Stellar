/**
 * store.ts — Zustand global state store
 */
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { EscrowData } from './stellar'

interface Toast {
  id: string
  type: 'success' | 'error' | 'pending' | 'info'
  title: string
  message?: string
  txHash?: string
  duration?: number
}

interface TrustVaultStore {
  // Wallet
  publicKey: string | null
  isConnected: boolean
  setWallet: (key: string | null) => void
  disconnect: () => void

  // Escrows (local cache)
  escrows: EscrowData[]
  setEscrows: (escrows: EscrowData[]) => void
  upsertEscrow: (escrow: EscrowData) => void

  // Toasts
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Pending transactions
  pendingTxHash: string | null
  setPendingTx: (hash: string | null) => void
}

export const useTrustVaultStore = create<TrustVaultStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Wallet
        publicKey: null,
        isConnected: false,
        setWallet: (key) => set({ publicKey: key, isConnected: !!key }),
        disconnect: () => set({ publicKey: null, isConnected: false, escrows: [] }),

        // Escrows
        escrows: [],
        setEscrows: (escrows) => set({ escrows }),
        upsertEscrow: (escrow) => {
          const current = get().escrows
          const idx = current.findIndex((e) => e.id === escrow.id)
          if (idx === -1) {
            set({ escrows: [...current, escrow] })
          } else {
            const updated = [...current]
            updated[idx] = escrow
            set({ escrows: updated })
          }
        },

        // Toasts
        toasts: [],
        addToast: (toast) => {
          const id = Math.random().toString(36).slice(2)
          set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
          const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 5000)
          setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
          }, duration)
        },
        removeToast: (id) =>
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

        // Pending tx
        pendingTxHash: null,
        setPendingTx: (hash) => set({ pendingTxHash: hash }),
      }),
      {
        name: 'trustvault-store',
        partialize: (s) => ({
          publicKey: s.publicKey,
          isConnected: s.isConnected,
        }),
      }
    )
  )
)
