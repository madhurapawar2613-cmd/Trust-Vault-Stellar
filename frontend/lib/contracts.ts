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

const server = new StellarSdk.SorobanRpc.Server(RPC_URL, { allowHttp: false })

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
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build()

  const simResult = await server.simulateTransaction(tx)
  if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simResult)) {
    const err = (simResult as any)
    throw new Error(`Simulation failed: ${err.error}`)
  }
  return { tx, simResult }
}

async function signAndSubmit(
  tx: StellarSdk.Transaction,
  simResult: StellarSdk.SorobanRpc.Api.SimulateTransactionSuccessResponse,
  signTransaction: (xdr: string) => Promise<string>,
) {
  const prepared = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build()
  const signedXdr = await signTransaction(prepared.toEnvelope().toXDR('base64'))
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  const result = await server.sendTransaction(signedTx)

  if (result.status === 'ERROR') {
    throw new Error(`Transaction failed: ${result.errorResult?.toXDR('base64')}`)
  }

  return result.hash
}

// ── Read Functions ────────────────────────────────────────────────────────────

export async function getEscrow(escrowId: number): Promise<EscrowData> {
  if (useTrustVaultStore.getState().isDemoMode) {
    const escrow = useTrustVaultStore.getState().escrows.find((e) => e.id === escrowId)
    if (!escrow) throw new Error('Escrow not found')
    return escrow
  }
  const contract = escrowContract()
  const account = await server.getAccount(
    // Use a funded testnet account for read-only simulation
    'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
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
  return StellarSdk.scValToNative(result.result!.retval) as EscrowData
}

export async function getEscrowCount(): Promise<number> {
  if (useTrustVaultStore.getState().isDemoMode) {
    return useTrustVaultStore.getState().escrows.length
  }
  const contract = escrowContract()
  const account = await server.getAccount(
    'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
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
    'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
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
  return StellarSdk.scValToNative(result.result!.retval)
}

// ── Write Functions ───────────────────────────────────────────────────────────

export async function createEscrow(params: {
  client: string
  freelancer: string
  tokenAddress: string
  milestones: Array<{ description: string; amount: string }>
  signTransaction: (xdr: string) => Promise<string>
}): Promise<string> {
  if (useTrustVaultStore.getState().isDemoMode) {
    await new Promise((r) => setTimeout(r, 1500))
    const id = useTrustVaultStore.getState().escrows.length + 1
    const newEscrow: EscrowData = {
      id,
      client: params.client,
      freelancer: params.freelancer,
      token: params.tokenAddress,
      total_amount: params.milestones.reduce((acc, m) => acc + BigInt(m.amount), 0n),
      released_amount: 0n,
      status: 'Active',
      dispute_contract: DISPUTE_CONTRACT_ID,
      created_at: Math.floor(Date.now() / 1000),
      milestones: params.milestones.map((m, i) => ({
        id: i,
        description: m.description,
        amount: BigInt(m.amount),
        completed: false,
        approved: false,
      })),
    }
    useTrustVaultStore.getState().upsertEscrow(newEscrow)
    return '153f47e16517a70b5508ef1e7cf644b22a33e1e976ae7330887d6d289e5c9fb0'
  }
  const contract = escrowContract()

  const milestonesScVal = StellarSdk.nativeToScVal(
    params.milestones.map((m, i) => ({
      id: i,
      description: m.description,
      amount: BigInt(m.amount),
      completed: false,
      approved: false,
    }))
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
  if (useTrustVaultStore.getState().isDemoMode) {
    await new Promise((r) => setTimeout(r, 1500))
    const escrows = useTrustVaultStore.getState().escrows
    const escrow = escrows.find((e) => e.id === params.escrowId)
    if (!escrow) throw new Error('Escrow not found')
    const updatedMilestones = escrow.milestones.map((m) =>
      m.id === params.milestoneId ? { ...m, completed: true } : m
    )
    const updatedEscrow = {
      ...escrow,
      milestones: updatedMilestones,
    }
    useTrustVaultStore.getState().upsertEscrow(updatedEscrow)
    return 'c797a61102168190175e339507c0e11167ac77f27fea7a6cc6aac6b55ae69350'
  }
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
  if (useTrustVaultStore.getState().isDemoMode) {
    await new Promise((r) => setTimeout(r, 1500))
    const escrows = useTrustVaultStore.getState().escrows
    const escrow = escrows.find((e) => e.id === params.escrowId)
    if (!escrow) throw new Error('Escrow not found')
    const milestone = escrow.milestones.find((m) => m.id === params.milestoneId)
    if (!milestone) throw new Error('Milestone not found')
    
    const updatedMilestones = escrow.milestones.map((m) =>
      m.id === params.milestoneId ? { ...m, approved: true } : m
    )
    
    const released_amount = escrow.released_amount + milestone.amount
    const allApproved = updatedMilestones.every((m) => m.approved)
    const status = allApproved ? ('Completed' as const) : escrow.status

    const updatedEscrow = {
      ...escrow,
      released_amount,
      status,
      milestones: updatedMilestones,
    }
    useTrustVaultStore.getState().upsertEscrow(updatedEscrow)
    return 'd480c266828d9cf0be19f1740ddd2f34d95a82639f6b446b6d03499dd9e41601'
  }
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
  if (useTrustVaultStore.getState().isDemoMode) {
    await new Promise((r) => setTimeout(r, 1500))
    const escrows = useTrustVaultStore.getState().escrows
    const escrow = escrows.find((e) => e.id === params.escrowId)
    if (!escrow) throw new Error('Escrow not found')
    const updatedEscrow = {
      ...escrow,
      status: 'Disputed' as const,
    }
    useTrustVaultStore.getState().upsertEscrow(updatedEscrow)
    return '88fa542a9e0e8e58767005fb047a3289b1238e0da629de0f6de81b16d4a6f89e'
  }
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
  if (useTrustVaultStore.getState().isDemoMode) {
    await new Promise((r) => setTimeout(r, 1500))
    const escrows = useTrustVaultStore.getState().escrows
    const escrow = escrows.find((e) => e.id === params.escrowId)
    if (!escrow) throw new Error('Escrow not found')
    const updatedEscrow = {
      ...escrow,
      status: 'Cancelled' as const,
    }
    useTrustVaultStore.getState().upsertEscrow(updatedEscrow)
    return '88fa542a9e0e8e58767005fb047a3289b1238e0da629de0f6de81b16d4a6f89e'
  }
  const contract = escrowContract()
  const op = contract.call(
    'cancel_escrow',
    StellarSdk.nativeToScVal(params.client, { type: 'address' }),
    StellarSdk.nativeToScVal(params.escrowId, { type: 'u32' }),
  )
  const { tx, simResult } = await buildAndSimulate(params.client, op)
  return signAndSubmit(tx, simResult, params.signTransaction)
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
