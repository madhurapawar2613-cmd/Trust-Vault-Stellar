#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, String, Vec, token, symbol_short,
};

// ── Data Types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowStatus {
    Active,
    Completed,
    Disputed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Milestone {
    pub id: u32,
    pub description: String,
    pub amount: i128,
    pub completed: bool,
    pub approved: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub id: u32,
    pub client: Address,
    pub freelancer: Address,
    pub token: Address,
    pub total_amount: i128,
    pub released_amount: i128,
    pub milestones: Vec<Milestone>,
    pub status: EscrowStatus,
    pub dispute_contract: Address,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Escrow(u32),
    EscrowCount,
    Admin,
    DisputeContract,
}

// ── Events ───────────────────────────────────────────────────────────────────

fn emit_escrow_created(env: &Env, escrow_id: u32, client: &Address, freelancer: &Address, amount: i128) {
    let topics = (symbol_short!("CREATED"), escrow_id);
    env.events().publish(topics, (client.clone(), freelancer.clone(), amount));
}

fn emit_milestone_completed(env: &Env, escrow_id: u32, milestone_id: u32, amount: i128) {
    let topics = (symbol_short!("MILESTONE"), escrow_id);
    env.events().publish(topics, (milestone_id, amount));
}

fn emit_dispute_raised(env: &Env, escrow_id: u32, raised_by: &Address) {
    let topics = (symbol_short!("DISPUTE"), escrow_id);
    env.events().publish(topics, raised_by.clone());
}

fn emit_funds_released(env: &Env, escrow_id: u32, to: &Address, amount: i128) {
    let topics = (symbol_short!("RELEASED"), escrow_id);
    env.events().publish(topics, (to.clone(), amount));
}

fn emit_escrow_cancelled(env: &Env, escrow_id: u32, to: &Address, amount: i128) {
    let topics = (symbol_short!("CANCEL"), escrow_id);
    env.events().publish(topics, (to.clone(), amount));
}

// ── Dispute contract client (inter-contract communication) ────────────────────
// When building for WASM, we import the compiled dispute wasm.
// When running tests with `testutils` feature, the dispute contract is
// registered directly in the test environment.

pub mod dispute_contract {
    soroban_sdk::contractimport!(
        file = "../target/wasm32-unknown-unknown/release/dispute.wasm"
    );
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {

    /// Initialize the contract with an admin and dispute contract address
    pub fn initialize(env: Env, admin: Address, dispute_contract: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::DisputeContract, &dispute_contract);
        env.storage().instance().set(&DataKey::EscrowCount, &0u32);
        env.storage().instance().extend_ttl(10_000, 10_000);
    }

    /// Create a new escrow with milestones
    pub fn create_escrow(
        env: Env,
        client: Address,
        freelancer: Address,
        token: Address,
        milestones: Vec<Milestone>,
    ) -> u32 {
        client.require_auth();

        if milestones.len() == 0 {
            panic!("Must have at least one milestone");
        }

        let total_amount: i128 = milestones.iter().map(|m| m.amount).sum();
        if total_amount <= 0 {
            panic!("Total amount must be positive");
        }

        // Lock tokens from client into contract escrow
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&client, &env.current_contract_address(), &total_amount);

        let dispute_contract: Address = env.storage().instance()
            .get(&DataKey::DisputeContract)
            .unwrap();

        let count: u32 = env.storage().instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(0);
        let escrow_id = count + 1;

        let escrow = Escrow {
            id: escrow_id,
            client: client.clone(),
            freelancer: freelancer.clone(),
            token: token.clone(),
            total_amount,
            released_amount: 0,
            milestones,
            status: EscrowStatus::Active,
            dispute_contract,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.storage().persistent().extend_ttl(&DataKey::Escrow(escrow_id), 100_000, 100_000);
        env.storage().instance().set(&DataKey::EscrowCount, &escrow_id);
        env.storage().instance().extend_ttl(10_000, 10_000);

        emit_escrow_created(&env, escrow_id, &client, &freelancer, total_amount);

        escrow_id
    }

    /// Freelancer marks a milestone as complete
    pub fn complete_milestone(env: Env, freelancer: Address, escrow_id: u32, milestone_id: u32) {
        freelancer.require_auth();

        let mut escrow: Escrow = env.storage().persistent()
            .get(&DataKey::Escrow(escrow_id))
            .expect("Escrow not found");

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }
        if escrow.freelancer != freelancer {
            panic!("Not the freelancer");
        }

        let mut milestones = escrow.milestones.clone();
        let milestone = milestones.get(milestone_id).expect("Milestone not found");
        let mut updated = milestone.clone();
        if updated.completed {
            panic!("Milestone already completed");
        }
        updated.completed = true;
        milestones.set(milestone_id, updated.clone());
        escrow.milestones = milestones;

        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.storage().persistent().extend_ttl(&DataKey::Escrow(escrow_id), 100_000, 100_000);
        emit_milestone_completed(&env, escrow_id, milestone_id, updated.amount);
    }

    /// Client approves a milestone and releases funds to freelancer
    pub fn approve_milestone(env: Env, client: Address, escrow_id: u32, milestone_id: u32) {
        client.require_auth();

        let mut escrow: Escrow = env.storage().persistent()
            .get(&DataKey::Escrow(escrow_id))
            .expect("Escrow not found");

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }
        if escrow.client != client {
            panic!("Not the client");
        }

        let mut milestones = escrow.milestones.clone();
        let milestone = milestones.get(milestone_id).expect("Milestone not found");

        if !milestone.completed {
            panic!("Milestone not completed yet");
        }
        if milestone.approved {
            panic!("Milestone already approved");
        }

        let amount = milestone.amount;
        let mut updated = milestone.clone();
        updated.approved = true;
        milestones.set(milestone_id, updated);
        escrow.milestones = milestones;
        escrow.released_amount += amount;

        // Release funds to freelancer
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &escrow.freelancer, &amount);

        // Check if all milestones are approved → mark completed
        let all_done = escrow.milestones.iter().all(|m| m.approved);
        if all_done {
            escrow.status = EscrowStatus::Completed;
        }

        emit_funds_released(&env, escrow_id, &escrow.freelancer, amount);
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.storage().persistent().extend_ttl(&DataKey::Escrow(escrow_id), 100_000, 100_000);
    }

    /// Raise a dispute — calls into DisputeContract (inter-contract communication)
    pub fn raise_dispute(env: Env, caller: Address, escrow_id: u32, reason: String) {
        caller.require_auth();

        let mut escrow: Escrow = env.storage().persistent()
            .get(&DataKey::Escrow(escrow_id))
            .expect("Escrow not found");

        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }
        if caller != escrow.client && caller != escrow.freelancer {
            panic!("Only client or freelancer can raise dispute");
        }

        escrow.status = EscrowStatus::Disputed;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.storage().persistent().extend_ttl(&DataKey::Escrow(escrow_id), 100_000, 100_000);

        // ── Inter-contract call ───────────────────────────────────────────────
        let dispute_client = dispute_contract::Client::new(&env, &escrow.dispute_contract);
        dispute_client.register_dispute(&escrow_id, &caller, &reason);

        emit_dispute_raised(&env, escrow_id, &caller);
    }

    /// Cancel escrow and refund client (only before any milestones approved)
    pub fn cancel_escrow(env: Env, client: Address, escrow_id: u32) {
        client.require_auth();

        let mut escrow: Escrow = env.storage().persistent()
            .get(&DataKey::Escrow(escrow_id))
            .expect("Escrow not found");

        if escrow.client != client {
            panic!("Not the client");
        }
        if escrow.status != EscrowStatus::Active {
            panic!("Escrow is not active");
        }
        let any_approved = escrow.milestones.iter().any(|m| m.approved);
        if any_approved {
            panic!("Cannot cancel: some milestones already approved");
        }

        let refund_amount = escrow.total_amount - escrow.released_amount;
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&env.current_contract_address(), &client, &refund_amount);

        escrow.status = EscrowStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        env.storage().persistent().extend_ttl(&DataKey::Escrow(escrow_id), 100_000, 100_000);

        emit_escrow_cancelled(&env, escrow_id, &client, refund_amount);
    }

    /// View escrow details (read-only simulation)
    pub fn get_escrow(env: Env, escrow_id: u32) -> Escrow {
        env.storage().persistent()
            .get(&DataKey::Escrow(escrow_id))
            .expect("Escrow not found")
    }

    /// Get total number of escrows created
    pub fn get_count(env: Env) -> u32 {
        env.storage().instance()
            .get(&DataKey::EscrowCount)
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
