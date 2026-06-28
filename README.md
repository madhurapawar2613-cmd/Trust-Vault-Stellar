# TrustVault 🔐
> **Decentralized, Milestone-Based Escrow with Integrated On-Chain Dispute Resolution on Stellar Soroban**

TrustVault is a premium, production-grade decentralized escrow platform built on the Stellar Soroban smart contract platform. It provides a secure, trustless system for clients and freelancers to lock funds, track and release payments milestone-by-milestone, and raise disputes that are arbitrated by a dedicated mediator contract — completely transparently and on-chain.

---

## 🌐 Active Testnet Deployment & Live Demo

The TrustVault protocol is live on the Stellar Testnet. Below are the verified contract deployment details and live resources:

| Item | Value / Location |
|------|------------------|
| **Live Demo URL** | [trust-vault-stellar.vercel.app](https://trust-vault-stellar.vercel.app) |
| **Walkthrough Demo Video** | [Watch on Google Drive](https://drive.google.com/file/d/1R1LIgGm8YmpczZjsisChjlLoxjQZsD6l/view?usp=drive_link) |
| `escrow` Contract ID | [`CBSC34HVESNUYHA44L7BPJFFCGJEVDIPW2LUI6UFST7NCOU7PCGJVCDB`](https://stellar.expert/explorer/testnet/contract/CBSC34HVESNUYHA44L7BPJFFCGJEVDIPW2LUI6UFST7NCOU7PCGJVCDB) |
| `dispute` Contract ID | [`CD6HNXUQ7OLA742HHYMXN5GEL2ZORLE7STV6UXQK6TCEB2K2ECC2EFN3`](https://stellar.expert/explorer/testnet/contract/CD6HNXUQ7OLA742HHYMXN5GEL2ZORLE7STV6UXQK6TCEB2K2ECC2EFN3) |
| Admin / Mediator Wallet | `GAU2K5F4X7F72LTSCFWBG6DEXKX3M6KCGFGPHVAH2ASDHN4OGUMM77JY` |
| Network | Stellar Testnet (`Test SDF Network ; September 2015`) |
| CI/CD Pipeline Status | [![CI/CD Status](https://github.com/madhurapawar2613-cmd/Trust-Vault-Stellar/actions/workflows/ci.yml/badge.svg)](https://github.com/madhurapawar2613-cmd/Trust-Vault-Stellar/actions/workflows/ci.yml) |

---

## 🏗️ Protocol Architecture & Flow

TrustVault uses a modular, two-contract design pattern to separate concerns between core escrow accounting and dispute mediation. 

```
┌──────────┐                 Client Funds
│  Client  ├───────────────────(Lock)────────────────────┐
└────┬─────┘                                             ▼
     │                                         ┌───────────────────┐
     │                                         │                   │
     ├───────────(Complete Milestone)─────────▶│  Escrow Contract  │
     │                                         │                   │
     │                                         └─────────┬─────────┘
     │                                                   │
     │                                             (Raise Dispute)
     │                                                   │
     ▼                                                   ▼
┌──────────┐                                   ┌───────────────────┐
│Freelancer│◀──────────(Release Funds)─────────┤ Dispute Contract  │
└──────────┘                                   └───────────────────┘
```

### 1. Smart Contract Layer
* **`escrow` Contract**: Manages the lifecycle of agreements, holds locked native token funds (SAC/XLM), manages milestones progress, and facilitates direct payments or refunds.
* **`dispute` Contract**: Handles arbitration. When a dispute is raised, the `escrow` contract locks its state and communicates via an inter-contract call to the `dispute` contract, which registers the dispute and awaits administrator/mediator resolution.

### 2. Event Streaming & Polling Layer
TrustVault streams contract events dynamically in the frontend (polling the Stellar Soroban RPC every 5 seconds) to allow the UI to reflect state changes (e.g. milestone completion, dispute registration, mediator decisions) in real-time.

---

## 🛠️ Advanced Web3 Engineering & Bug Fix Log

During rigorous testing and QA, several complex blockchain engineering hurdles were solved to make the platform production-ready:

### ⚡ Single-Transaction Soroban Auth Tree (Bypassing `txBadAuth` errors)
* **The Problem**: Initially, the escrow creation used a two-step transaction pattern: first sending a token `approve()` transaction, followed by `create_escrow()`. This caused sequence number collisions because both transactions were simulated simultaneously. Additionally, since the contract logic utilizes `token.transfer()` to move funds from the client directly to the contract (authorized by the client's signature), the `approve` pattern was redundant and caused authorization errors.
* **The Solution**: Removed the `approve` step. Instead, we rely on Soroban's native `simulateTransaction` capability. The simulation automatically detects the nested `token.transfer` call within `create_escrow` and builds a complete, nested authorization tree. The frontend then calls `assembleTransaction` to embed these authorization details, enabling the client to sign and authorize the entire transaction (including token transfer) in a **single Freighter popup signature**.

### 🔄 Real-Time Freighter Account Synchronization (Desync Fix)
* **The Problem**: When users switched active accounts or networks inside the Freighter browser extension, the React application state remained desynchronized. This led to transactions being simulated with one public key but signed by another, resulting in `txBadAuth` (-6) validation errors.
* **The Solution**: Integrated Freighter's `WatchWalletChanges` listener into the custom `useWallet` react hook. The app now listens to extension events in real time and automatically updates active public keys and builds new transactions cleanly under the correct active key.

### 🩺 Safe Read-Only Simulation Fallbacks & Type Normalization
* **The Problem**: Read-only operations (`getEscrow`, `getDispute`, `getEscrowCount`) were built using a 55-character simulation source address (`GAAZI...` - missing the final character), throwing silent `invalid encoded string` errors which caused the dashboard to render empty. Furthermore, `scValToNative` returns Soroban enums as arrays (e.g., `status: ["Active"]`) and large integers as strings, creating hydration mismatches on the client.
* **The Solution**: Corrected the fallback address to the valid 56-character deployer key (`GAU2...`) and normalized parsed `ScVal` payloads into correct JS types (`BigInt`, `Number`, and flat `string` status variables) before they hit the state store.

### 📦 Webpack Native Binary Exclusions (Client Bundle Fix)
* **The Problem**: Loading `@stellar/stellar-sdk` on the client side crashed pages with `TypeError: Cannot read properties of undefined (reading 'call')` because Webpack attempted to bundle Node-native C++ addon dependencies (`sodium-native`, `require-addon`).
* **The Solution**: Configured Webpack aliases in `next.config.js` to map `sodium-native` and `require-addon` to `false` in the browser bundle. Webpack replaces them with empty mocks, allowing the JS-fallback cryptos to function cleanly in the browser.

---

## 📸 Screenshots

### 📱 Mobile Responsive UI
Interactive components optimized for mobile viewports:

![Mobile Responsive Landing Page](assets/mobile_responsive_ui.png)

### 💻 Desktop Layouts & Interactive Escrow Lifecycle
A comprehensive tour of the user interface across various states of the application:

#### 1. Public Landing Page (Disconnected)
![Public Landing Page](assets/landing_page.png)

#### 2. Connected User Dashboard (Active Escrows & Stats)
![Connected User Dashboard](assets/connected_dashboard.png)

#### 3. Interactive Escrow Details (Milestones & Statuses)
![Interactive Escrow Details](assets/escrow_details.png)

#### 4. Passing Rust & Frontend Test Suites
![Test Output](assets/test_output.png)

#### 5. CI/CD Pipeline Running (Passing GitHub Actions)
![CI/CD Pipeline](assets/cicd_pipeline.png)

---

## 🚀 Setup & Installation Guide

### Prerequisites
* [Rust](https://rustup.rs/) (with `wasm32-unknown-unknown` toolchain target)
* [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli)
* [Node.js 20+](https://nodejs.org/)
* [Freighter Wallet](https://freighter.app/) extension

### 1. Build and Test Smart Contracts
```bash
# Clone the repository
git clone https://github.com/madhurapawar2613-cmd/Trust-Vault-Stellar.git
cd "Trust-Vault-Stellar/contracts"

# Build contracts (build dispute first, then escrow)
cargo build -p dispute --release --target wasm32-unknown-unknown
cargo build -p escrow --release --target wasm32-unknown-unknown

# Run Rust contract test suite
cargo test --features testutils
```

### 2. Configure and Run Frontend
```bash
cd ../frontend

# Install dependencies and start next dev server
npm install --legacy-peer-deps
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and connect Freighter.

---

## 🧪 Comprehensive Test Suites

TrustVault incorporates thorough test coverage across both smart contract layers and frontend components:

### Rust Contract Tests (11 test cases)
* **Dispute Contract**: Tests dispute registration, client/freelancer resolution logic, dispute withdrawal, and global statistics.
* **Escrow Contract**: Tests escrow creation, milestone progression, full release completions, dispute raising, cancellation refund rules, and multiple escrow separation.

### Frontend Jest Tests (24 test cases)
* **`EscrowCard.test.tsx`**: Validates rendering of active, completed, cancelled, and disputed states.
* **`MilestoneTracker.test.tsx`**: Validates milestone action logic based on user roles.
* **`stellar.test.ts`**: Verifies stroops/XLM conversions, address validation, status mappings, and explorer URL builders.

---

## 🛡️ CI/CD Pipeline

The automated CI/CD pipeline runs on every push to `main` and `develop` branches:

1. **🦀 Contract Tests**: Checks formatting (`cargo fmt`), runs linter (`cargo clippy -- -D warnings`), and executes contract tests.
2. **⚛️ Frontend Tests**: Runs type checks (`tsc --noEmit`), linter (`eslint`), runs Jest tests with coverage, and builds the production bundle.
3. **🚀 Deploy**: Deploys to Vercel production hosting automatically upon merge.
4. **🔐 Security Audit**: Checks Rust crates using `cargo-audit` (configured via `audit.toml` in repository root) and npm dependencies.

---

## 📝 License

Distributed under the MIT License.
