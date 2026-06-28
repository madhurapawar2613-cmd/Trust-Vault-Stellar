'use client'
import { useState, useEffect, useCallback } from 'react'
import { useTrustVaultStore } from '@/lib/store'

// Freighter API types
declare global {
  interface Window {
    freighter?: unknown
  }
}

async function getFreighterAPI() {
  try {
    const api = await import('@stellar/freighter-api')
    return api
  } catch {
    return null
  }
}

export function useWallet() {
  const { publicKey, isConnected, setWallet, disconnect: storeDisconnect } =
    useTrustVaultStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freighterInstalled, setFreighterInstalled] = useState(false)

  useEffect(() => {
    // Auto-reconnect if previously connected
    checkExistingConnection()
  }, [])

  async function checkExistingConnection() {
    const api = await getFreighterAPI()
    if (!api) return
    try {
      const isAllowedFn = (api as any).isAllowed
      if (isAllowedFn) {
        const allowedRes = await isAllowedFn()
        const allowed = typeof allowedRes === 'boolean' ? allowedRes : !!(allowedRes && allowedRes.isAllowed)
        if (allowed) {
          const getAddrFn = (api as any).getAddress || (api as any).getPublicKey
          if (getAddrFn) {
            const result = await getAddrFn()
            const key = typeof result === 'string' ? result : result?.address
            if (key) setWallet(key)
          }
        }
      } else {
        const connectedFn = (api as any).isConnected
        if (connectedFn) {
          const connRes = await connectedFn()
          const connected = typeof connRes === 'boolean' ? connRes : !!(connRes && connRes.isConnected)
          if (connected) {
            const getAddrFn = (api as any).getPublicKey || (api as any).getAddress
            const result = await getAddrFn()
            const key = typeof result === 'string' ? result : result?.address
            if (key) setWallet(key)
          }
        }
      }
      setFreighterInstalled(true)
    } catch {
      // Freighter not available
    }
  }

  const connect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const api = await getFreighterAPI()
      if (!api) {
        setError('Freighter wallet not installed. Please install the Freighter browser extension.')
        return
      }
      setFreighterInstalled(true)
      const requestAccessFn = (api as any).requestAccess || (api as any).getPublicKey
      if (!requestAccessFn) {
        throw new Error('Freighter API not initialized correctly')
      }
      const result = await requestAccessFn()
      const key = typeof result === 'string' ? result : result?.address
      if (!key) {
        if (result && (result as any).error) {
          throw new Error((result as any).error)
        }
        throw new Error('No public key returned. Please make sure your Freighter wallet is unlocked and authorized.')
      }
      setWallet(key)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to connect wallet'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [setWallet])

  const disconnect = useCallback(() => {
    storeDisconnect()
    setError(null)
  }, [storeDisconnect])

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      const api = await getFreighterAPI()
      if (!api) throw new Error('Freighter not available')
      const result = await api.signTransaction(xdr, {
        networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE,
      })
      return typeof result === 'string' ? result : (result as any).signedTxXdr
    },
    []
  )

  return {
    publicKey,
    isConnected,
    loading,
    error,
    freighterInstalled,
    connect,
    disconnect,
    signTransaction,
  }
}
