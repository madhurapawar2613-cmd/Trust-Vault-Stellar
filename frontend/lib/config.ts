// Stellar Network Config
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015'

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? 'https://soroban-testnet.stellar.org'

export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org'

// Contract IDs — set after deployment
export const ESCROW_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID ?? ''

export const DISPUTE_CONTRACT_ID =
  process.env.NEXT_PUBLIC_DISPUTE_CONTRACT_ID ?? ''

// Native XLM token address on testnet
export const NATIVE_TOKEN =
  process.env.NEXT_PUBLIC_NATIVE_TOKEN ??
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'

// UI
export const EXPLORER_URL = 'https://stellar.expert/explorer/testnet'
export const POLL_INTERVAL_MS = 5000
