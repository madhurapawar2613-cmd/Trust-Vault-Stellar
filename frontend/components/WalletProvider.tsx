'use client'
// WalletProvider wraps the app — currently a thin context layer.
// Zustand store handles wallet state; this exists for future context needs
// (e.g., @stellar/wallet-kit integration).
export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
