'use client'
import { useState, useEffect, useCallback } from 'react'
import { getEscrow, getEscrowCount } from '@/lib/contracts'
import { useTrustVaultStore } from '@/lib/store'
import type { EscrowData } from '@/lib/stellar'

export function useEscrows(publicKey: string | null) {
  const { escrows, setEscrows, upsertEscrow } = useTrustVaultStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!publicKey) return
    setLoading(true)
    setError(null)
    // Normalize to uppercase for case-insensitive comparison with contract data
    const normalizedKey = publicKey.toUpperCase()
    try {
      const count = await getEscrowCount()
      const fetched: EscrowData[] = []
      for (let i = 1; i <= count; i++) {
        try {
          const e = await getEscrow(i)
          // Normalize both sides before comparing
          if (
            e.client.toUpperCase() === normalizedKey ||
            e.freelancer.toUpperCase() === normalizedKey
          ) {
            fetched.push(e)
          }
        } catch { /* skip missing IDs */ }
      }
      setEscrows(fetched)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load escrows')
    } finally {
      setLoading(false)
    }
  }, [publicKey, setEscrows])

  // Fetch on mount and whenever publicKey changes
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Auto-refetch when user returns to the tab (e.g. after signing in Freighter)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') fetchAll()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchAll])

  return { escrows, loading, error, refetch: fetchAll, upsertEscrow }
}

export function useEscrow(escrowId: number) {
  const [escrow, setEscrow] = useState<EscrowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getEscrow(escrowId)
      setEscrow(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Escrow not found')
    } finally {
      setLoading(false)
    }
  }, [escrowId])

  useEffect(() => {
    if (escrowId > 0) fetch()
  }, [fetch, escrowId])

  return { escrow, loading, error, refetch: fetch }
}
