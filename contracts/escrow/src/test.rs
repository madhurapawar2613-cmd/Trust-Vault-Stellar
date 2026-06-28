#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, Env, String, Vec};

use dispute::DisputeContract;

/// Helper: register Stellar asset contract and return token client
fn create_token<'a>(env: &'a Env, admin: &Address) -> (Address, token::StellarAssetClient<'a>) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token_id = sac.address();
    let token_client = token::StellarAssetClient::new(env, &token_id);
    (token_id, token_client)
}

/// Helper: full test setup — deploy both contracts
fn setup(
    env: &Env,
) -> (
    Address,                       // admin
    Address,                       // client wallet
    Address,                       // freelancer wallet
    Address,                       // token contract id
    token::StellarAssetClient<'_>, // token client
    EscrowContractClient<'_>,      // escrow client
) {
    let admin = Address::generate(env);
    let client_addr = Address::generate(env);
    let freelancer_addr = Address::generate(env);

    let (token_id, token) = create_token(env, &admin);

    // Register dispute contract natively
    let dispute_id = env.register_contract(None, DisputeContract);
    let dispute_init = dispute_contract::Client::new(env, &dispute_id);
    dispute_init.initialize(&admin);

    // Register escrow contract
    let escrow_id = env.register_contract(None, EscrowContract);
    let escrow_client = EscrowContractClient::new(env, &escrow_id);
    escrow_client.initialize(&admin, &dispute_id);

    (
        admin,
        client_addr,
        freelancer_addr,
        token_id,
        token,
        escrow_client,
    )
}

fn two_milestones(env: &Env) -> Vec<Milestone> {
    Vec::from_array(
        env,
        [
            Milestone {
                id: 0,
                description: String::from_str(env, "Design mockups"),
                amount: 400,
                completed: false,
                approved: false,
            },
            Milestone {
                id: 1,
                description: String::from_str(env, "Final delivery"),
                amount: 600,
                completed: false,
                approved: false,
            },
        ],
    )
}

// ── Test 1: Create escrow ────────────────────────────────────────────────────
#[test]
fn test_create_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client_addr, freelancer_addr, token_id, token, escrow_client) = setup(&env);
    token.mint(&client_addr, &1000);

    let escrow_id = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &token_id,
        &two_milestones(&env),
    );

    assert_eq!(escrow_id, 1);
    assert_eq!(escrow_client.get_count(), 1);

    let escrow = escrow_client.get_escrow(&1);
    assert_eq!(escrow.total_amount, 1000);
    assert_eq!(escrow.released_amount, 0);
    assert_eq!(escrow.status, EscrowStatus::Active);
    assert_eq!(escrow.client, client_addr);
    assert_eq!(escrow.freelancer, freelancer_addr);
}

// ── Test 2: Complete and approve one milestone ───────────────────────────────
#[test]
fn test_complete_and_approve_milestone() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client_addr, freelancer_addr, token_id, token, escrow_client) = setup(&env);
    token.mint(&client_addr, &1000);

    let escrow_id = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &token_id,
        &two_milestones(&env),
    );

    // Freelancer completes milestone 0
    escrow_client.complete_milestone(&freelancer_addr, &escrow_id, &0);
    let escrow = escrow_client.get_escrow(&escrow_id);
    assert!(escrow.milestones.get(0).unwrap().completed);
    assert!(!escrow.milestones.get(0).unwrap().approved);

    // Client approves → 400 released
    escrow_client.approve_milestone(&client_addr, &escrow_id, &0);
    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.released_amount, 400);
    assert_eq!(escrow.status, EscrowStatus::Active); // 1 milestone remains

    assert_eq!(
        token::Client::new(&env, &token_id).balance(&freelancer_addr),
        400
    );
}

// ── Test 3: Full completion flow ─────────────────────────────────────────────
#[test]
fn test_full_completion() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client_addr, freelancer_addr, token_id, token, escrow_client) = setup(&env);
    token.mint(&client_addr, &1000);

    let escrow_id = escrow_client.create_escrow(
        &client_addr,
        &freelancer_addr,
        &token_id,
        &two_milestones(&env),
    );

    escrow_client.complete_milestone(&freelancer_addr, &escrow_id, &0);
    escrow_client.approve_milestone(&client_addr, &escrow_id, &0);
    escrow_client.complete_milestone(&freelancer_addr, &escrow_id, &1);
    escrow_client.approve_milestone(&client_addr, &escrow_id, &1);

    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Completed);
    assert_eq!(escrow.released_amount, 1000);
    assert_eq!(
        token::Client::new(&env, &token_id).balance(&freelancer_addr),
        1000
    );
    assert_eq!(token::Client::new(&env, &token_id).balance(&client_addr), 0);
}

// ── Test 4: Raise dispute ────────────────────────────────────────────────────
#[test]
fn test_raise_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client_addr, freelancer_addr, token_id, token, escrow_client) = setup(&env);
    token.mint(&client_addr, &500);

    let milestones = Vec::from_array(
        &env,
        [Milestone {
            id: 0,
            description: String::from_str(&env, "Deliverable"),
            amount: 500,
            completed: false,
            approved: false,
        }],
    );

    let escrow_id =
        escrow_client.create_escrow(&client_addr, &freelancer_addr, &token_id, &milestones);

    escrow_client.raise_dispute(
        &client_addr,
        &escrow_id,
        &String::from_str(&env, "Work not delivered as agreed"),
    );

    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Disputed);
}

// ── Test 5: Cancel escrow refunds client ────────────────────────────────────
#[test]
fn test_cancel_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client_addr, freelancer_addr, token_id, token, escrow_client) = setup(&env);
    token.mint(&client_addr, &800);

    let milestones = Vec::from_array(
        &env,
        [Milestone {
            id: 0,
            description: String::from_str(&env, "Logo Design"),
            amount: 800,
            completed: false,
            approved: false,
        }],
    );

    let escrow_id =
        escrow_client.create_escrow(&client_addr, &freelancer_addr, &token_id, &milestones);
    assert_eq!(token::Client::new(&env, &token_id).balance(&client_addr), 0); // funds locked

    escrow_client.cancel_escrow(&client_addr, &escrow_id);
    assert_eq!(
        token::Client::new(&env, &token_id).balance(&client_addr),
        800
    ); // refunded

    let escrow = escrow_client.get_escrow(&escrow_id);
    assert_eq!(escrow.status, EscrowStatus::Cancelled);
}

// ── Test 6: Multiple escrows increment count ─────────────────────────────────
#[test]
fn test_multiple_escrows() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, client_addr, freelancer_addr, token_id, token, escrow_client) = setup(&env);
    token.mint(&client_addr, &3000);

    let m1 = Vec::from_array(
        &env,
        [Milestone {
            id: 0,
            description: String::from_str(&env, "Task A"),
            amount: 1000,
            completed: false,
            approved: false,
        }],
    );
    let m2 = Vec::from_array(
        &env,
        [Milestone {
            id: 0,
            description: String::from_str(&env, "Task B"),
            amount: 2000,
            completed: false,
            approved: false,
        }],
    );

    let id1 = escrow_client.create_escrow(&client_addr, &freelancer_addr, &token_id, &m1);
    let id2 = escrow_client.create_escrow(&client_addr, &freelancer_addr, &token_id, &m2);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(escrow_client.get_count(), 2);

    assert_eq!(escrow_client.get_escrow(&id1).total_amount, 1000);
    assert_eq!(escrow_client.get_escrow(&id2).total_amount, 2000);
}
