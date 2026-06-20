#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, String, symbol_short,
};

// ── Data Types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DisputeStatus {
    Open,
    ResolvedForClient,
    ResolvedForFreelancer,
    Withdrawn,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Dispute {
    pub escrow_id: u32,
    pub raised_by: Address,
    pub reason: String,
    pub status: DisputeStatus,
    pub created_at: u64,
    pub resolved_at: u64,
}

#[contracttype]
pub enum DataKey {
    Dispute(u32),
    DisputeCount,
    Admin,
    AuthorizedCallers,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct DisputeContract;

#[contractimpl]
impl DisputeContract {

    /// Initialize with an admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::DisputeCount, &0u32);
        env.storage().instance().extend_ttl(10_000, 10_000);
    }

    /// Called by the escrow contract via inter-contract communication.
    /// Registers a new dispute for the given escrow ID.
    pub fn register_dispute(env: Env, escrow_id: u32, raised_by: Address, reason: String) {
        // No auth required here — caller is the escrow contract itself.
        // In production you would validate env.current_contract_address() is authorized.

        let dispute = Dispute {
            escrow_id,
            raised_by: raised_by.clone(),
            reason,
            status: DisputeStatus::Open,
            created_at: env.ledger().timestamp(),
            resolved_at: 0,
        };

        env.storage().persistent().set(&DataKey::Dispute(escrow_id), &dispute);
        env.storage().persistent().extend_ttl(&DataKey::Dispute(escrow_id), 100_000, 100_000);

        // Update count
        let count: u32 = env.storage().instance()
            .get(&DataKey::DisputeCount)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::DisputeCount, &(count + 1));
        env.storage().instance().extend_ttl(10_000, 10_000);

        // Emit event
        let topics = (symbol_short!("DISPUTE"), escrow_id);
        env.events().publish(topics, raised_by);
    }

    /// Admin resolves a dispute in favor of either client or freelancer.
    pub fn resolve_dispute(
        env: Env,
        admin: Address,
        escrow_id: u32,
        favor_client: bool,
    ) {
        admin.require_auth();

        let admin_stored: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .expect("Not initialized");
        if admin != admin_stored {
            panic!("Not admin");
        }

        let mut dispute: Dispute = env.storage().persistent()
            .get(&DataKey::Dispute(escrow_id))
            .expect("Dispute not found");

        if dispute.status != DisputeStatus::Open {
            panic!("Dispute already resolved");
        }

        dispute.status = if favor_client {
            DisputeStatus::ResolvedForClient
        } else {
            DisputeStatus::ResolvedForFreelancer
        };
        dispute.resolved_at = env.ledger().timestamp();

        env.storage().persistent().set(&DataKey::Dispute(escrow_id), &dispute);
        env.storage().persistent().extend_ttl(&DataKey::Dispute(escrow_id), 100_000, 100_000);

        // Emit resolution event
        let resolution = if favor_client { symbol_short!("CLIENT") } else { symbol_short!("FREELNCR") };
        let topics = (symbol_short!("RESOLVED"), escrow_id);
        env.events().publish(topics, resolution);
    }

    /// Withdraw a dispute (caller must be the one who raised it)
    pub fn withdraw_dispute(env: Env, caller: Address, escrow_id: u32) {
        caller.require_auth();

        let mut dispute: Dispute = env.storage().persistent()
            .get(&DataKey::Dispute(escrow_id))
            .expect("Dispute not found");

        if dispute.status != DisputeStatus::Open {
            panic!("Dispute already resolved or withdrawn");
        }
        if dispute.raised_by != caller {
            panic!("Only the dispute raiser can withdraw");
        }

        dispute.status = DisputeStatus::Withdrawn;
        dispute.resolved_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Dispute(escrow_id), &dispute);
        env.storage().persistent().extend_ttl(&DataKey::Dispute(escrow_id), 100_000, 100_000);

        let topics = (symbol_short!("WITHDREW"), escrow_id);
        env.events().publish(topics, caller);
    }

    /// Get dispute details (read-only)
    pub fn get_dispute(env: Env, escrow_id: u32) -> Dispute {
        env.storage().persistent()
            .get(&DataKey::Dispute(escrow_id))
            .expect("Dispute not found")
    }

    /// Get total dispute count
    pub fn get_count(env: Env) -> u32 {
        env.storage().instance()
            .get(&DataKey::DisputeCount)
            .unwrap_or(0)
    }

    /// Get admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance()
            .get(&DataKey::Admin)
            .expect("Not initialized")
    }
}

mod test;

