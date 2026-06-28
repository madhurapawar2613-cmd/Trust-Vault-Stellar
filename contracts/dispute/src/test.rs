#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup_dispute_contract(env: &Env) -> (Address, Address, DisputeContractClient<'_>) {
    let admin = Address::generate(env);
    let contract_id = env.register_contract(None, DisputeContract);
    let client = DisputeContractClient::new(env, &contract_id);
    client.initialize(&admin);
    (admin, contract_id, client)
}

// ── Test 1: Register and retrieve a dispute ───────────────────────────────────
#[test]
fn test_register_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, _contract_id, client) = setup_dispute_contract(&env);

    let raiser = Address::generate(&env);
    let reason = String::from_str(&env, "Work was not delivered on time");

    client.register_dispute(&1u32, &raiser, &reason);

    let dispute = client.get_dispute(&1u32);
    assert_eq!(dispute.escrow_id, 1);
    assert_eq!(dispute.status, DisputeStatus::Open);
    assert_eq!(dispute.raised_by, raiser);
}

// ── Test 2: Admin resolves dispute in favor of client ────────────────────────
#[test]
fn test_resolve_dispute_favor_client() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, _contract_id, client) = setup_dispute_contract(&env);

    let raiser = Address::generate(&env);
    client.register_dispute(
        &2u32,
        &raiser,
        &String::from_str(&env, "Unsatisfactory work"),
    );

    client.resolve_dispute(&admin, &2u32, &true);

    let dispute = client.get_dispute(&2u32);
    assert_eq!(dispute.status, DisputeStatus::ResolvedForClient);
}

// ── Test 3: Admin resolves dispute in favor of freelancer ────────────────────
#[test]
fn test_resolve_dispute_favor_freelancer() {
    let env = Env::default();
    env.mock_all_auths();

    let (admin, _contract_id, client) = setup_dispute_contract(&env);

    let raiser = Address::generate(&env);
    client.register_dispute(
        &3u32,
        &raiser,
        &String::from_str(&env, "Client unresponsive"),
    );

    client.resolve_dispute(&admin, &3u32, &false);

    let dispute = client.get_dispute(&3u32);
    assert_eq!(dispute.status, DisputeStatus::ResolvedForFreelancer);
}

// ── Test 4: Withdraw dispute ─────────────────────────────────────────────────
#[test]
fn test_withdraw_dispute() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, _contract_id, client) = setup_dispute_contract(&env);

    let raiser = Address::generate(&env);
    client.register_dispute(
        &4u32,
        &raiser,
        &String::from_str(&env, "Misunderstanding resolved"),
    );

    client.withdraw_dispute(&raiser, &4u32);

    let dispute = client.get_dispute(&4u32);
    assert_eq!(dispute.status, DisputeStatus::Withdrawn);
}

// ── Test 5: Dispute count increments ─────────────────────────────────────────
#[test]
fn test_dispute_count() {
    let env = Env::default();
    env.mock_all_auths();

    let (_admin, _contract_id, client) = setup_dispute_contract(&env);

    assert_eq!(client.get_count(), 0);

    let raiser = Address::generate(&env);
    client.register_dispute(&5u32, &raiser, &String::from_str(&env, "Test"));
    assert_eq!(client.get_count(), 1);

    client.register_dispute(&6u32, &raiser, &String::from_str(&env, "Test 2"));
    assert_eq!(client.get_count(), 2);
}
