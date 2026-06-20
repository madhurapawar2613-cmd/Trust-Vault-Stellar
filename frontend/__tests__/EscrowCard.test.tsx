import { render, screen } from '@testing-library/react'
import { EscrowCard } from '@/components/EscrowCard'
import type { EscrowData } from '@/lib/stellar'

// Mock framer-motion — strip animation-only props inside the factory (jest.mock is hoisted)
jest.mock('framer-motion', () => {
  const MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'layout', 'layoutId',
  ])
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  const MotionDiv = ({ children, ...props }: Record<string, unknown>) => {
    const domProps = Object.fromEntries(Object.entries(props).filter(([k]) => !MOTION_PROPS.has(k)))
    return React.createElement('div', domProps, children)
  }
  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: { children: unknown }) => children,
  }
})

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const CLIENT_KEY = 'GABC1234567890ABCDE12345678901234567890ABCDE12345678901234'
const FREELANCER_KEY = 'GDEF1234567890ABCDE12345678901234567890ABCDE12345678901234'

const mockEscrow: EscrowData = {
  id: 1,
  client: CLIENT_KEY,
  freelancer: FREELANCER_KEY,
  token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYC',
  total_amount: 10_000_000_0n, // 10 XLM in stroops
  released_amount: 5_000_000_0n,
  status: 'Active',
  dispute_contract: 'CCONTRACT...',
  created_at: 1718000000,
  milestones: [
    { id: 0, description: 'Phase 1', amount: 5_000_000_0n, completed: true, approved: true },
    { id: 1, description: 'Phase 2', amount: 5_000_000_0n, completed: false, approved: false },
  ],
}

describe('EscrowCard', () => {
  // ── Test 1 ───────────────────────────────────────────────────────────────
  it('renders Active status badge', () => {
    render(<EscrowCard escrow={mockEscrow} userPublicKey={CLIENT_KEY} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  // ── Test 2 ───────────────────────────────────────────────────────────────
  it('shows correct milestone progress fraction', () => {
    render(<EscrowCard escrow={mockEscrow} userPublicKey={CLIENT_KEY} />)
    expect(screen.getByText('1/2')).toBeInTheDocument()
  })

  // ── Test 3 ───────────────────────────────────────────────────────────────
  it('identifies user as client ("You hired")', () => {
    render(<EscrowCard escrow={mockEscrow} userPublicKey={CLIENT_KEY} />)
    expect(screen.getByText(/You hired/i)).toBeInTheDocument()
  })

  // ── Test 4 ───────────────────────────────────────────────────────────────
  it('identifies user as freelancer ("Working for")', () => {
    render(<EscrowCard escrow={mockEscrow} userPublicKey={FREELANCER_KEY} />)
    expect(screen.getByText(/Working for/i)).toBeInTheDocument()
  })

  // ── Test 5 ───────────────────────────────────────────────────────────────
  it('renders Disputed status with correct label', () => {
    const disputed = { ...mockEscrow, status: 'Disputed' as const }
    render(<EscrowCard escrow={disputed} userPublicKey={CLIENT_KEY} />)
    expect(screen.getByText('Disputed')).toBeInTheDocument()
  })

  // ── Test 6 ───────────────────────────────────────────────────────────────
  it('links to escrow detail page', () => {
    render(<EscrowCard escrow={mockEscrow} userPublicKey={CLIENT_KEY} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/escrow/1')
  })
})
