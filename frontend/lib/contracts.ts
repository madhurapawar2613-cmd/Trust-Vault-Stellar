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
  onApproveStart?: () => void
  onCreateStart?: () => void
}): Promise<string> {
  const contract = escrowContract()

  // Calculate total amount for token approval
  const totalAmount = params.milestones.reduce((sum, m) => sum + BigInt(m.amount), 0n)

  // ── Step 1: Approve token transfer ──────────────────────────────────────
  // The escrow contract calls token.transfer() from the client, which requires
  // the client to have pre-approved the escrow contract as a spender.
  params.onApproveStart?.()
  const tokenContract = new StellarSdk.Contract(params.tokenAddress)
  // Ledger expiry: ~7 days at 5s/ledger = 120,960 ledgers
  const expireLedger = (await server.getLatestLedger()).sequence + 120_960
  const approveOp = tokenContract.call(
    'approve',
    StellarSdk.nativeToScVal(params.client, { type: 'address' }),
    StellarSdk.nativeToScVal(ESCROW_CONTRACT_ID, { type: 'address' }),
    StellarSdk.nativeToScVal(totalAmount, { type: 'i128' }),
    StellarSdk.nativeToScVal(expireLedger, { type: 'u32' }),
  )
  const { tx: approveTx, simResult: approveSim } = await buildAndSimulate(params.client, approveOp)
  await signAndSubmit(approveTx, approveSim, params.signTransaction)

  // ── Step 2: Create the escrow ────────────────────────────────────────────
  params.onCreateStart?.()
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
