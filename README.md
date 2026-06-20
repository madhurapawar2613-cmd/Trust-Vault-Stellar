# TrustVault 🔐

> **Decentralized escrow on Stellar Soroban** — milestone-based, dispute-resolved, trustless.

[![CI/CD](https://github.com/yourusername/trustvault/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/trustvault/actions/workflows/ci.yml)

---

## Overview

TrustVault is a production-ready decentralized escrow platform built on the Stellar Soroban smart contract platform. Clients and freelancers can lock funds in on-chain escrow, release them milestone by milestone, and raise disputes that are resolved by an independent mediator contract — all transparently on-chain.

---

## Architecture

```
Client ──funds──▶ EscrowContract ──inter-contract──▶ DisputeContract
                      │                                      │
                   milestone                            register_dispute
                   release                              resolve_dispute
                      │
                  Freelancer
```

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| `escrow` | Holds funds, manages milestones, triggers dispute registration |
| `dispute` | Records and resolves disputes; called by the escrow contract |

Inter-contract communication: `EscrowContract::raise_dispute` calls `DisputeContract::register_dispute` directly.

### Events emitted

| Symbol | Trigger |
|--------|---------|
| `CREATED` | New escrow created |
| `MILESTONE` | Freelancer marked milestone complete |
| `RELEASED` | Client approved milestone, funds released |
| `DISPUTE` | Dispute raised |
| `CANCEL` | Escrow cancelled, refund issued |

---

## Project Structure

```
trust-vault stellar/
├── contracts/
│   ├── Cargo.toml              # Workspace
│   ├── escrow/src/
│   │   ├── lib.rs              # Escrow contract (create, milestone, dispute, cancel)
│   │   └── test.rs             # 6 contract tests
│   └── dispute/src/
│       ├── lib.rs              # Dispute resolver contract
│       └── test.rs             # 5 contract tests
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Dashboard (hero + escrow grid)
│   │   ├── create/page.tsx     # Multi-step escrow creation
│   │   ├── escrow/[id]/page.tsx # Detail view with live events
│   │   └── disputes/page.tsx   # Disputes management
│   ├── components/             # EscrowCard, MilestoneTracker, DisputeModal…
│   ├── hooks/                  # useWallet, useEscrow, useEvents
│   ├── lib/                    # Stellar SDK, contracts, Zustand store
│   └── __tests__/              # 19+ Jest tests
├── .github/workflows/ci.yml    # 4-job CI/CD pipeline
└── .env.example
```

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) + `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli)
- [Node.js 20+](https://nodejs.org/)
- [Freighter Wallet](https://freighter.app/) browser extension

### 1. Clone & install

```bash
git clone https://github.com/yourusername/trustvault
cd "trust-vault stellar"
```

### 2. Build contracts

```bash
cd contracts
rustup target add wasm32-unknown-unknown

# Build dispute first (escrow imports its WASM)
cargo build -p dispute --release --target wasm32-unknown-unknown

# Build escrow
cargo build -p escrow --release --target wasm32-unknown-unknown
```

### 3. Run contract tests

```bash
cd contracts
cargo test --features testutils -- --nocapture
```

### 4. Deploy contracts to testnet

```bash
# Fund an account on testnet
stellar keys generate deployer --network testnet

# Deploy dispute contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/dispute.wasm \
  --source deployer \
  --network testnet

# Deploy escrow contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/escrow.wasm \
  --source deployer \
  --network testnet

# Initialize both contracts
stellar contract invoke \
  --id <DISPUTE_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize --admin <ADMIN_ADDRESS>

stellar contract invoke \
  --id <ESCROW_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize --admin <ADMIN_ADDRESS> --dispute_contract <DISPUTE_CONTRACT_ID>
```

### 5. Configure & run frontend

```bash
cd frontend
cp ../.env.example .env.local

# Edit .env.local with your deployed contract IDs
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect Freighter.

---

## Testing

### Contract Tests (Rust)

```bash
cd contracts
cargo test --features testutils
```

11 tests total:
- `dispute`: 5 tests (register, resolve client, resolve freelancer, withdraw, count)
- `escrow`: 6 tests (create, complete+approve, full completion, raise dispute, cancel, multiple)

### Frontend Tests (Jest)

```bash
cd frontend
npm test               # run all
npm run test:coverage  # with coverage report
```

19 tests across:
- `EscrowCard.test.tsx` — 6 tests
- `stellar.test.ts` — 10 tests
- `MilestoneTracker.test.tsx` — 7 tests

---

## CI/CD Pipeline

GitHub Actions runs on every push to `main` / `develop`:

| Job | Steps |
|-----|-------|
| 🦀 Contract Tests | clippy + fmt check + test + WASM build |
| ⚛️ Frontend Tests | tsc + eslint + jest + next build |
| 🚀 Deploy | Vercel production deploy (main only) |
| 🔐 Security Audit | cargo audit + npm audit |

Required GitHub Secrets:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `ESCROW_CONTRACT_ID`, `DISPUTE_CONTRACT_ID`

---

## Design System

| Token | Value |
|-------|-------|
| Background | `#0A0B0F` |
| Surface | `#13151C` |
| Accent Primary | `#6366F1` (Indigo) |
| Accent Success | `#10B981` (Emerald) |
| Accent Warning | `#F59E0B` (Amber) |
| Display Font | Space Grotesk |
| Body Font | Inter |
| Mono Font | JetBrains Mono |

Signature elements:
- Animated glowing vault door SVG on hero (slow rotation ring)
- Pulsing green dot on active escrows
- Pulsing amber dot on disputed escrows

---

## Level 3 Requirements Checklist

- [x] **Inter-contract communication** — `EscrowContract` calls `DisputeContract::register_dispute` directly
- [x] **Event streaming** — `subscribeToEscrowEvents` polls on-chain events every 5s with live UI updates
- [x] **CI/CD pipeline** — 4-job GitHub Actions (lint→test→build→deploy)
- [x] **Mobile-responsive frontend** — Responsive grid, mobile nav, CSS breakpoints
- [x] **3+ passing tests** — 11 Rust + 19 Jest = **30 total tests**
- [x] **Complete documentation** — This README + inline code comments
- [x] **10+ meaningful commits** — Feature-level commits per contract/component
- [x] **Two contracts** — `escrow` + `dispute` with defined API surface
- [x] **Freighter wallet integration** — Full connect/disconnect/sign flow
- [x] **Testnet deployment ready** — `stellar-cli` deploy commands documented

---

## License

MIT
