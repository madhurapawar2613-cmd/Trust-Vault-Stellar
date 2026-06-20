/**
 * stellar.ts — Stellar SDK helpers: formatting, address utils, type defs
 */

export const STROOPS_PER_XLM = 10_000_000n

/** Format stroops (bigint) to human-readable XLM string */
export function formatXLM(stroops: bigint | number | string): string {
  const n = BigInt(stroops.toString())
  const xlm = Number(n) / 10_000_000
  return `${xlm.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 7 })} XLM`
}

/** Shorten a Stellar address for display */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

/** Validate a Stellar public key (G...) */
export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z0-9]{55}$/.test(address)
}

/** Convert stroops (number) to XLM float */
export function stroopsToXLM(stroops: number | bigint): number {
  return Number(BigInt(stroops.toString())) / 10_000_000
}

/** Convert XLM float to stroops bigint */
export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.round(xlm * 10_000_000))
}

/** Escrow status → display config */
export const STATUS_CONFIG = {
  Active: { color: '#10B981', label: 'Active', pulse: true, bg: 'rgba(16,185,129,0.1)' },
  Completed: { color: '#6366F1', label: 'Completed', pulse: false, bg: 'rgba(99,102,241,0.1)' },
  Disputed: { color: '#F59E0B', label: 'Disputed', pulse: true, bg: 'rgba(245,158,11,0.1)' },
  Cancelled: { color: '#EF4444', label: 'Cancelled', pulse: false, bg: 'rgba(239,68,68,0.1)' },
} as const

export type EscrowStatus = keyof typeof STATUS_CONFIG

/** Dispute status display */
export const DISPUTE_STATUS_CONFIG = {
  Open: { color: '#F59E0B', label: 'Open' },
  ResolvedForClient: { color: '#10B981', label: 'Resolved: Client' },
  ResolvedForFreelancer: { color: '#6366F1', label: 'Resolved: Freelancer' },
  Withdrawn: { color: '#94A3B8', label: 'Withdrawn' },
} as const

/** Stellar explorer link for a tx hash */
export function explorerTxUrl(hash: string, network = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/tx/${hash}`
}

/** Stellar explorer link for a contract */
export function explorerContractUrl(contractId: string, network = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/contract/${contractId}`
}

// ── Frontend Escrow & Milestone types ─────────────────────────────────────────

export interface MilestoneData {
  id: number
  description: string
  amount: bigint
  completed: boolean
  approved: boolean
}

export interface EscrowData {
  id: number
  client: string
  freelancer: string
  token: string
  total_amount: bigint
  released_amount: bigint
  milestones: MilestoneData[]
  status: EscrowStatus
  dispute_contract: string
  created_at: number
}

export interface DisputeData {
  escrow_id: number
  raised_by: string
  reason: string
  status: string
  created_at: number
  resolved_at: number
}
