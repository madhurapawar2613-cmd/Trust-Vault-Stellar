'use client'
import { useEffect, useRef, useCallback } from 'react'
import { subscribeToEscrowEvents } from '@/lib/contracts'
import { useTrustVaultStore } from '@/lib/store'

interface EscrowEvent {
  type: string
  data: unknown
}

export function useEscrowEvents(
  escrowId: number,
  onEvent?: (event: EscrowEvent) => void
) {
  const { addToast } = useTrustVaultStore()
  const unsubRef = useRef<(() => void) | null>(null)

  const handleEvent = useCallback((event: EscrowEvent) => {
    onEvent?.(event)

    // Show toast for relevant events
    switch (event.type) {
      case 'CREATED':
        addToast({ type: 'success', title: 'Escrow Created', message: 'New escrow is now active on-chain.' })
        break
      case 'MILESTONE':
        addToast({ type: 'info', title: 'Milestone Completed', message: 'A milestone was marked complete. Review and approve to release funds.' })
        break
      case 'RELEASED':
        addToast({ type: 'success', title: 'Funds Released', message: 'Payment has been released to the freelancer.' })
        break
      case 'DISPUTE':
        addToast({ type: 'error', title: 'Dispute Raised', message: 'A dispute has been opened on this escrow.', duration: 10000 })
        break
      case 'CANCEL':
        addToast({ type: 'info', title: 'Escrow Cancelled', message: 'The escrow was cancelled and funds refunded.' })
        break
    }
  }, [onEvent, addToast])

  useEffect(() => {
    if (escrowId <= 0) return

    // Small delay to avoid hammering the RPC on mount
    const timer = setTimeout(() => {
      unsubRef.current = subscribeToEscrowEvents(escrowId, handleEvent)
    }, 1000)

    return () => {
      clearTimeout(timer)
      unsubRef.current?.()
    }
  }, [escrowId, handleEvent])
}

/** Subscribe to all escrow events (for dashboard-level notifications) */
export function useAllEscrowEvents(onEvent?: (event: EscrowEvent) => void) {
  useEscrowEvents(-1, onEvent)
}
