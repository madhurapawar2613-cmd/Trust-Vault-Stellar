'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ArrowRight, ArrowLeft, Loader2, CheckCircle, Lock } from 'lucide-react'

import { useWallet } from '@/hooks/useWallet'
import { createEscrow } from '@/lib/contracts'
import { isValidStellarAddress, xlmToStroops } from '@/lib/stellar'
import { useTrustVaultStore } from '@/lib/store'
import { NATIVE_TOKEN } from '@/lib/config'

interface MilestoneForm {
  description: string
  amount: string
}

type Step = 1 | 2 | 3

export default function CreateEscrow() {
  const router = useRouter()
  const { publicKey, isConnected, signTransaction } = useWallet()
  const { addToast, setPendingTx } = useTrustVaultStore()

  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Form state
  const [freelancer, setFreelancer] = useState('')
  const [freelancerError, setFreelancerError] = useState('')
  const [milestones, setMilestones] = useState<MilestoneForm[]>([
    { description: '', amount: '' },
  ])

  const totalXLM = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)

  function addMilestone() {
    if (milestones.length >= 10) return
    setMilestones([...milestones, { description: '', amount: '' }])
  }

  function removeMilestone(idx: number) {
    if (milestones.length === 1) return
    setMilestones(milestones.filter((_, i) => i !== idx))
  }

  function updateMilestone(idx: number, field: keyof MilestoneForm, value: string) {
    const updated = [...milestones]
    updated[idx] = { ...updated[idx], [field]: value }
    setMilestones(updated)
  }

  function validateStep1(): boolean {
    if (!isValidStellarAddress(freelancer)) {
      setFreelancerError('Enter a valid Stellar public key (starts with G...)')
      return false
    }
    if (freelancer === publicKey) {
      setFreelancerError("You can't be your own freelancer.")
      return false
    }
    setFreelancerError('')
    return true
  }

  function validateStep2(): boolean {
    for (const m of milestones) {
      if (!m.description.trim()) return false
      const amt = parseFloat(m.amount)
      if (isNaN(amt) || amt <= 0) return false
    }
    return totalXLM > 0
  }

  async function handleSubmit() {
    if (!publicKey || !signTransaction) return
    setLoading(true)
    try {
      const hash = await createEscrow({
        client: publicKey,
        freelancer,
        tokenAddress: NATIVE_TOKEN,
        milestones: milestones.map((m) => ({
          description: m.description,
          amount: xlmToStroops(parseFloat(m.amount)).toString(),
        })),
        signTransaction,
      })
      setTxHash(hash)
      setPendingTx(hash)
      addToast({ type: 'success', title: 'Escrow Created!', message: 'Your escrow is now live on-chain.', txHash: hash })
      setStep(3)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transaction failed'
      addToast({ type: 'error', title: 'Failed to create escrow', message: msg })
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div style={{ maxWidth: '540px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Connect your wallet to create an escrow.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '4px' }}>
          New Escrow
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Create a milestone-based escrow agreement secured on Stellar.
        </p>
      </motion.div>

      {/* Step indicator */}
      {step !== 3 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
          {([1, 2] as const).map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: step >= s ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                border: `1px solid ${step >= s ? 'var(--accent-primary)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: step >= s ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s',
              }}>
                {s}
              </div>
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-display)', color: step === s ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: step === s ? 600 : 400 }}>
                {s === 1 ? 'Parties' : 'Milestones'}
              </span>
              {s === 1 && <div style={{ width: '32px', height: '1px', background: 'var(--border)', margin: '0 4px' }} />}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Step 1: Parties ── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="card"
            style={{ padding: '1.75rem' }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', marginBottom: '1.5rem' }}>
              Party Details
            </h2>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label" htmlFor="client-addr">Your address (Client)</label>
              <div className="address" style={{ padding: '10px 12px', fontSize: '0.8rem' }}>
                {publicKey}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label" htmlFor="freelancer-addr">Freelancer&apos;s Stellar address</label>
              <input
                id="freelancer-addr"
                className={`input ${freelancerError ? 'error' : ''}`}
                placeholder="GABCD... (Stellar public key)"
                value={freelancer}
                onChange={(e) => { setFreelancer(e.target.value.trim()); setFreelancerError('') }}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
              />
              {freelancerError && (
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginTop: '5px' }}>{freelancerError}</p>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => validateStep1() && setStep(2)}
            >
              Continue <ArrowRight size={15} />
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Milestones ── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="card" style={{ padding: '1.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem' }}>
                  Milestones
                </h2>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '0.78rem', padding: '5px 12px', gap: '6px' }}
                  onClick={addMilestone}
                  disabled={milestones.length >= 10}
                >
                  <Plus size={13} /> Add
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {milestones.map((m, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-elevated"
                    style={{ padding: '1rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                      }}>
                        Milestone {idx + 1}
                      </span>
                      {milestones.length > 1 && (
                        <button
                          className="btn-ghost"
                          style={{ padding: '4px' }}
                          onClick={() => removeMilestone(idx)}
                        >
                          <Trash2 size={14} style={{ color: 'var(--accent-danger)' }} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        className="input"
                        placeholder="Describe this milestone..."
                        value={m.description}
                        onChange={(e) => updateMilestone(idx, 'description', e.target.value)}
                        style={{ fontSize: '0.875rem' }}
                      />
                      <div style={{ position: 'relative' }}>
                        <input
                          className="input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="0.00"
                          value={m.amount}
                          onChange={(e) => updateMilestone(idx, 'amount', e.target.value)}
                          style={{ paddingRight: '52px', fontFamily: 'var(--font-mono)' }}
                        />
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          pointerEvents: 'none',
                        }}>XLM</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Total */}
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Total locked
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--accent-secondary)' }}>
                  {totalXLM.toFixed(2)} XLM
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-outline"
                style={{ flex: '0 0 auto', gap: '7px' }}
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleSubmit}
                disabled={!validateStep2() || loading}
              >
                {loading ? (
                  <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating Escrow...</>
                ) : (
                  <><Lock size={15} /> Lock Funds & Create</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Success ── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{ padding: '3rem 2rem', textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              style={{
                width: '64px', height: '64px',
                background: 'rgba(16,185,129,0.12)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <CheckCircle size={32} style={{ color: 'var(--accent-secondary)' }} />
            </motion.div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 700, marginBottom: '8px' }}>
              Escrow Created!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Your funds are now locked on-chain. The freelancer can start working.
            </p>

            {txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'block', marginBottom: '1.5rem' }}
              >
                <div className="address" style={{ padding: '10px', textAlign: 'center', cursor: 'pointer' }}>
                  {txHash.slice(0, 16)}...{txHash.slice(-12)}
                </div>
              </a>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => router.push('/')}
            >
              View Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
