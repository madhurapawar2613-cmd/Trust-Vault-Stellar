import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MilestoneTracker } from '@/components/MilestoneTracker'
import type { MilestoneData } from '@/lib/stellar'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

const mockMilestones: MilestoneData[] = [
  { id: 0, description: 'Design mockups', amount: 400_000_000n, completed: false, approved: false },
  { id: 1, description: 'Backend API', amount: 600_000_000n, completed: true, approved: false },
  { id: 2, description: 'Final delivery', amount: 1_000_000_000n, completed: true, approved: true },
]

describe('MilestoneTracker', () => {
  // ── Test 1 ───────────────────────────────────────────────────────────────
  it('renders all milestone descriptions', () => {
    render(
      <MilestoneTracker
        milestones={mockMilestones}
        userRole="client"
        escrowStatus="Active"
      />
    )
    expect(screen.getByText('Design mockups')).toBeInTheDocument()
    expect(screen.getByText('Backend API')).toBeInTheDocument()
    expect(screen.getByText('Final delivery')).toBeInTheDocument()
  })

  // ── Test 2 ───────────────────────────────────────────────────────────────
  it('shows "Mark Done" button for freelancer on incomplete milestone', () => {
    render(
      <MilestoneTracker
        milestones={mockMilestones}
        userRole="freelancer"
        escrowStatus="Active"
      />
    )
    // Milestone 0 is not completed, so freelancer should see "Mark Done"
    expect(screen.getByText('Mark Done')).toBeInTheDocument()
  })

  // ── Test 3 ───────────────────────────────────────────────────────────────
  it('shows "Approve & Pay" button for client on completed-not-approved milestone', () => {
    render(
      <MilestoneTracker
        milestones={mockMilestones}
        userRole="client"
        escrowStatus="Active"
      />
    )
    // Milestone 1: completed=true, approved=false → client should see approve
    expect(screen.getByText(/Approve & Pay/i)).toBeInTheDocument()
  })

  // ── Test 4 ───────────────────────────────────────────────────────────────
  it('shows "Paid ✓" for approved milestone', () => {
    render(
      <MilestoneTracker
        milestones={mockMilestones}
        userRole="client"
        escrowStatus="Active"
      />
    )
    // Milestone 2: approved=true
    expect(screen.getByText(/Paid ✓/)).toBeInTheDocument()
  })

  // ── Test 5 ───────────────────────────────────────────────────────────────
  it('hides action buttons when escrow is not Active', () => {
    render(
      <MilestoneTracker
        milestones={mockMilestones}
        userRole="freelancer"
        escrowStatus="Disputed"
      />
    )
    expect(screen.queryByText('Mark Done')).not.toBeInTheDocument()
  })

  // ── Test 6 ───────────────────────────────────────────────────────────────
  it('calls onComplete when "Mark Done" is clicked', async () => {
    const onComplete = jest.fn()
    render(
      <MilestoneTracker
        milestones={mockMilestones}
        userRole="freelancer"
        escrowStatus="Active"
        onComplete={onComplete}
      />
    )
    const btn = screen.getByText('Mark Done')
    await userEvent.click(btn)
    expect(onComplete).toHaveBeenCalledWith(0)
  })

  // ── Test 7 ───────────────────────────────────────────────────────────────
  it('calls onApprove when "Approve & Pay" is clicked', async () => {
    const onApprove = jest.fn()
    render(
      <MilestoneTracker
        milestones={mockMilestones}
        userRole="client"
        escrowStatus="Active"
        onApprove={onApprove}
      />
    )
    const btn = screen.getByText(/Approve & Pay/i)
    await userEvent.click(btn)
    expect(onApprove).toHaveBeenCalledWith(1)
  })
})
