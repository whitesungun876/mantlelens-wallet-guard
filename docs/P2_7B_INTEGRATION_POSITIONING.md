# P2.7B-4 Integration Positioning

## Goal

Position MantleLens as a Mantle-first pre-action risk intelligence layer without adding a new product page or changing the core workflow.

This pass is copy and presentation only:

- no new top-level navigation
- no risk-engine changes
- no scan/proof behavior changes
- no new signing, revoke, swap, transfer, or custody path

## What MantleLens Is

MantleLens is a Mantle-first EVM risk intelligence layer for pre-action wallet review. Wallets, DeFi protocols, and agents can request an evidence-bound assessment before a user signs, approves, enters a pool, or asks another agent to act.

Allowed positioning:

- Mantle-first EVM risk intelligence layer
- adapter-ready architecture
- optimized for Mantle wallets
- assessment hash recorded on Mantle

## What It Is Not

MantleLens is not a broad chain scanner, a wallet-safety guarantee, a custody product, or an execution bot. Missing indexed data remains unknown, and assessment proof verifies the assessment record rather than wallet safety.

## Use Cases

### Wallet Integration

Wallets can call MantleLens before a user signs or interacts, to surface approval, transfer, coverage, and Mantle-native yield exposure signals.

### DeFi Protocol Integration

Protocols can use MantleLens as a pre-interaction wallet risk check before users enter pools, approve spenders, or interact with yield assets.

### Agent / MCP Integration

Other agents can call MantleLens through MCP-style tools to request an evidence-bound wallet risk assessment before taking action.

## Product Placement

- Advanced page bottom: small `Integration layer` card with three use cases.
- README: Integration Positioning section.
- Docs: this phase note.
- Overview: unchanged; no heavy integration marketing.

## Safety Boundaries

- No private key custody.
- No seed phrase handling.
- No automatic wallet connection.
- No automatic transaction broadcast.
- No real revoke/swap/transfer in the default demo path.
- LLM explains; it does not execute or override hard rules.
- Assessment hash proves the assessment record, not wallet safety.

## Verification

Commands:

```bash
python3 -m unittest tests.test_presentation_state_semantics -v
python3 -m unittest tests.test_p2_7b_mantle_native_signals -v
python3 -m unittest tests.test_p2_7b_agent_decision_audit -v
python3 -m unittest tests.test_p2_7b_integration_positioning -v
cd frontend/app && npm run typecheck
cd frontend/app && npm run build
./scripts/qa_all.sh
```

## Snapshot

Created before this pass:

```text
snapshots/p2_7b3_agent_decision_audit_pass_20260610_145003.tar.gz
```
