/**
 * contracts.ts — On-chain interactions with the Escrow and Dispute contracts.
 * Uses @stellar/stellar-sdk for transaction building, simulation, and submission.
 */
import * as StellarSdk from '@stellar/stellar-sdk'
import {
  ESCROW_CONTRACT_ID,
  DISPUTE_CONTRACT_ID,
  NETWORK_PASSPHRASE,
  RPC_URL,
  POLL_INTERVAL_MS,
} from './config'
import type { EscrowData, MilestoneData } from './stellar'
import { useTrustVaultStore } from './store'

const server = new StellarSdk.SorobanRpc.Server(RPC_URL, { allowHttp: true })

// ── Helpers ───────────────────────────────────────────────────────────────────

function escrowContract() {
  return new StellarSdk.Contract(ESCROW_CONTRACT_ID)
}

function disputeContract() {
  return new StellarSdk.Contract(DISPUTE_CONTRACT_ID)
}

async function buildAndSimulate(
  source: string,
  op: StellarSdk.xdr.Operation,
) {
  const account = await server.getAccount(source)
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '1000000', // 1 XLM max — Soroban resource fees can be high
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(300) // 5 minutes — enough time to sign in Freighter
    .build()

  const simResult = await server.simulateTransaction(tx)
  if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simResult)) {
    const err = (simResult as StellarSdk.SorobanRpc.Api.SimulateTransactionErrorResponse)
    console.error('[TrustVault] Simulation failed:', err.error)
    throw new Error(`Simulation failed: ${err.error}`)
  }
  return { tx, simResult }
}

async function signAndSubmit(
  tx: StellarSdk.Transaction,
  simResult: StellarSdk.SorobanRpc.Api.SimulateTransactionSuccessResponse,
  signTransaction: (xdr: string) => Promise<string>,
  signAuthEntry?: (entryXdr: string) => Promise<string>,
) {
  // assembleTransaction adds resource limits + fee bump + auth entries from simulation
  const prepared = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build()

  // Debug: log auth entries to understand what needs signing
  const ops = prepared.operations
  for (const op of ops) {
    if (op.type === 'invokeHostFunction') {
      const invokeOp = op as StellarSdk.Operation.InvokeHostFunction
      console.log('[TrustVault] Auth entries count:', invokeOp.auth?.length ?? 0)
      invokeOp.auth?.forEach((authEntry, i) => {
        const credType = authEntry.credentials().switch().name
        console.log(`[TrustVault] Auth[${i}] credential type:`, credType)
      })
    }
  }

  const signedXdr = await signTransaction(prepared.toEnvelope().toXDR('base64'))
  if (!signedXdr) {
    throw new Error('Wallet signing was cancelled or returned empty result')
  }

  console.log('[TrustVault] Got signed XDR, submitting...')
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  const result = await server.sendTransaction(signedTx)

  console.log('[TrustVault] sendTransaction status:', result.status)
  if (result.status === 'ERROR') {
    const errXdr = result.errorResult?.toXDR('base64') ?? 'unknown'
    console.error('[TrustVault] sendTransaction error XDR:', errXdr)
    throw new Error(`Transaction failed: ${errXdr}`)
  }

  return result.hash
}

// ── Read Functions ────────────────────────────────────────────────────────────

export async function getEscrow(escrowId: number): Promise<EscrowData> {
  const contract = escrowContract()
  const account = await server.getAccount(
    'GAU2K5F4X7F72LTSCFWBG6DEXKX3M6KCGFGPHVAH2ASDHN4OGUMM77JY'
  )
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'get_escrow',
        StellarSdk.nativeToScVal(escrowId, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build()

  const result = await server.simulateTransaction(tx)
  if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(result)) {
    throw new Error('Failed to fetch escrow')
  }

  const raw = StellarSdk.scValToNative(result.result!.retval)
  return {
    ...raw,
    id: Number(raw.id),
    created_at: Number(raw.created_at),
    released_amount: BigInt(raw.released_amount || 0),
    total_amount: BigInt(raw.total_amount || 0),
    status: Array.isArray(raw.status) ? raw.status[0] : raw.status,
    milestones: (raw.milestones || []).map((m: any) => ({
      ...m,
      id: Number(m.id),
      amount: BigInt(m.amount || 0),
      completed: !!m.completed,
      approved: !!m.approved,
    })),
  } as EscrowData
}

export async function getEscrowCount(): Promise<number> {
  const contract = escrowContract()
  const account = await server.getAccount(
    'GAU2K5F4X7F72LTSCFWBG6DEXKX3M6KCGFGPHVAH2ASDHN4OGUMM77JY'
  )
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_count'))
    .setTimeout(30)
    .build()

  const result = await server.simulateTransaction(tx)
  if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(result)) {
    return 0
  }
  return Number(StellarSdk.scValToNative(result.result!.retval))
}

export async function getDispute(escrowId: number) {
  const contract = disputeContract()
  const account = await server.getAccount(
    'GAU2K5F4X7F72LTSCFWBG6DEXKX3M6KCGFGPHVAH2ASDHN4OGUMM77JY'
  )
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call('get_dispute', StellarSdk.nativeToScVal(escrowId, { type: 'u32' }))
    )
    .setTimeout(30)
    .build()

  const result = await server.simulateTransaction(tx)
  if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(result)) {
    return null
  }
  
  const raw = StellarSdk.scValToNative(result.result!.retval)
  return {
    ...raw,
    escrow_id: Number(raw.escrow_id),
    created_at: Number(raw.created_at),
    resolved_at: Number(raw.resolved_at),
    status: Array.isArray(raw.status) ? raw.status[0] : raw.status,
  }
}

// ── Write Functions ───────────────────────────────────────────────────────────

export async function createEscrow(params: {
  client: string
  freelancer: string
  tokenAddress: string
  milestones: Array<{ description: string; amount: string }>
  signTransaction: (xdr: string) => Promise<string>
}): Promise<string> {
  const contract = escrowContract()

  // The escrow contract calls token.transfer(client → contract, amount).
  // Soroban's simulateTransaction automatically builds the full auth tree
  // for nested calls (including token.transfer), so NO separate approve()
  // transaction is needed. assembleTransaction embeds all auth entries and
  // Freighter signs them in one shot.
  const milestonesScVal = StellarSdk.xdr.ScVal.scvVec(
    params.milestones.map((m, i) => {
      // Struct fields must be sorted alphabetically for Soroban serialization:
      // amount, approved, completed, description, id
      return StellarSdk.xdr.ScVal.scvMap([
        new StellarSdk.xdr.ScMapEntry({
          key: StellarSdk.nativeToScVal('amount', { type: 'symbol' }),
          val: StellarSdk.nativeToScVal(BigInt(m.amount), { type: 'i128' }),
        }),
        new StellarSdk.xdr.ScMapEntry({
          key: StellarSdk.nativeToScVal('approved', { type: 'symbol' }),
          val: StellarSdk.nativeToScVal(false, { type: 'bool' }),
        }),
        new StellarSdk.xdr.ScMapEntry({
          key: StellarSdk.nativeToScVal('completed', { type: 'symbol' }),
          val: StellarSdk.nativeToScVal(false, { type: 'bool' }),
        }),
        new StellarSdk.xdr.ScMapEntry({
          key: StellarSdk.nativeToScVal('description', { type: 'symbol' }),
          val: StellarSdk.nativeToScVal(m.description, { type: 'string' }),
        }),
        new StellarSdk.xdr.ScMapEntry({
          key: StellarSdk.nativeToScVal('id', { type: 'symbol' }),
          val: StellarSdk.nativeToScVal(i, { type: 'u32' }),
        }),
      ])
    })
  )

  const op = contract.call(
    'create_escrow',
    StellarSdk.nativeToScVal(params.client, { type: 'address' }),
    StellarSdk.nativeToScVal(params.freelancer, { type: 'address' }),
    StellarSdk.nativeToScVal(params.tokenAddress, { type: 'address' }),
    milestonesScVal,
  )

  const { tx, simResult } = await buildAndSimulate(params.client, op)
  return signAndSubmit(tx, simResult, params.signTransaction)
}

export async function completeMilestone(params: {
  freelancer: string
  escrowId: number
  milestoneId: number
  signTransaction: (xdr: string) => Promise<string>
}): Promise<string> {
  const contract = escrowContract()
  const op = contract.call(
    'complete_milestone',
    StellarSdk.nativeToScVal(params.freelancer, { type: 'address' }),
    StellarSdk.nativeToScVal(params.escrowId, { type: 'u32' }),
    StellarSdk.nativeToScVal(params.milestoneId, { type: 'u32' }),
  )
  const { tx, simResult } = await buildAndSimulate(params.freelancer, op)
  return signAndSubmit(tx, simResult, params.signTransaction)
}

export async function approveMilestone(params: {
  client: string
  escrowId: number
  milestoneId: number
  signTransaction: (xdr: string) => Promise<string>
}): Promise<string> {
  const contract = escrowContract()
  const op = contract.call(
    'approve_milestone',
    StellarSdk.nativeToScVal(params.client, { type: 'address' }),
    StellarSdk.nativeToScVal(params.escrowId, { type: 'u32' }),
    StellarSdk.nativeToScVal(params.milestoneId, { type: 'u32' }),
  )
  const { tx, simResult } = await buildAndSimulate(params.client, op)
  return signAndSubmit(tx, simResult, params.signTransaction)
}

export async function raiseDispute(params: {
  caller: string
  escrowId: number
  reason: string
  signTransaction: (xdr: string) => Promise<string>
}): Promise<string> {
  const contract = escrowContract()
  const op = contract.call(
    'raise_dispute',
    StellarSdk.nativeToScVal(params.caller, { type: 'address' }),
    StellarSdk.nativeToScVal(params.escrowId, { type: 'u32' }),
    StellarSdk.nativeToScVal(params.reason, { type: 'string' }),
  )
  const { tx, simResult } = await buildAndSimulate(params.caller, op)
  return signAndSubmit(tx, simResult, params.signTransaction)
}

export async function cancelEscrow(params: {
  client: string
  escrowId: number
  signTransaction: (xdr: string) => Promise<string>
}): Promise<string> {
  const contract = escrowContract()
  const op = contract.call(
    'cancel_escrow',
    StellarSdk.nativeToScVal(params.client, { type: 'address' }),
    StellarSdk.nativeToScVal(params.escrowId, { type: 'u32' }),
  )
  const { tx, simResult } = await buildAndSimulate(params.client, op)
  return signAndSubmit(tx, simResult, params.signTransaction)
}

// ── Dispute Resolution (Mediator) ─────────────────────────────────────────────

export async function resolveDispute(params: {
  admin: string
  escrowId: number
  winner: 'client' | 'freelancer'
  signTransaction: (xdr: string) => Promise<string>
}): Promise<string> {
  const contract = disputeContract()
  const winnerVariant = params.winner === 'client' ? 'ResolvedForClient' : 'ResolvedForFreelancer'
  const op = contract.call(
    'resolve_dispute',
    StellarSdk.nativeToScVal(params.admin, { type: 'address' }),
    StellarSdk.nativeToScVal(params.escrowId, { type: 'u32' }),
    StellarSdk.xdr.ScVal.scvVec([
      StellarSdk.nativeToScVal(winnerVariant, { type: 'symbol' }),
    ]),
  )
  const { tx, simResult } = await buildAndSimulate(params.admin, op)
  return signAndSubmit(tx, simResult, params.signTransaction)
}

/** Poll for transaction finality — resolves when tx is confirmed on-chain */
export async function waitForConfirmation(hash: string, maxAttempts = 20): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await server.getTransaction(hash)
      if (result.status === 'SUCCESS') return true
      if (result.status === 'FAILED') return false
    } catch { /* not yet indexed */ }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}

// ── Event Streaming (polling) ─────────────────────────────────────────────────

export function subscribeToEscrowEvents(
  escrowId: number,
  onEvent: (event: { type: string; data: unknown }) => void
): () => void {
  let lastLedger = 0
  let stopped = false

  ;(async () => {
    try {
      const latest = await server.getLatestLedger()
      lastLedger = Math.max(0, latest.sequence - 1)
    } catch (_) {}
  })()

  const poll = setInterval(async () => {
    if (stopped) return
    try {
      const events = await server.getEvents({
        startLedger: lastLedger,
        filters: [{
          type: 'contract',
          contractIds: [ESCROW_CONTRACT_ID],
        }],
        limit: 100,
      })

      for (const event of events.events) {
        const topics = event.topic.map((t) => StellarSdk.scValToNative(t))
        if (topics[1] === escrowId || escrowId === -1) {
          onEvent({
            type: String(topics[0]),
            data: StellarSdk.scValToNative(event.value),
          })
        }
        lastLedger = Math.max(lastLedger, event.ledger + 1)
      }
    } catch (_) {
      // Swallow polling errors gracefully
    }
  }, POLL_INTERVAL_MS)

  return () => {
    stopped = true
    clearInterval(poll)
  }
}
