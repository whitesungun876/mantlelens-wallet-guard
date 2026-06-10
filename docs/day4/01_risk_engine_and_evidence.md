# Day 4 Risk Engine And Evidence Layer

## Goal

Day 4 delivers the first runnable white-box risk kernel and evidence bundle builder. LLMs do not participate in scoring, red flags, evidence hashing, or claim binding.

## Code

| File | Purpose |
|---|---|
| `backend/mantlelens/risk.py` | Fixed-threshold P0 risk kernel |
| `backend/mantlelens/evidence.py` | Evidence normalization, hash generation, binding validation |
| `backend/mantlelens/hashutil.py` | Canonical JSON and deterministic hashing |
| `tests/test_day3_day4_harness.py` | Tool, risk, evidence, and UNKNOWN harness tests |

## Scoring Dimensions

| Dimension | Weight | Implemented Day 4 Rules |
|---|---:|---|
| Approval Risk | 35% | Active unknown spender, unlimited approval, high USD at risk |
| Suspicious Transfer Risk | 25% | Lookalike/dust transfer, fake token signal, new recipient |
| Asset Concentration Risk | 20% | Top asset %, top 3 asset %, non-stable concentration floor |
| RWA/Yield Risk | 15% | mETH/cmETH exposure, liquidity warning, cmETH warning threshold |
| DeFi Exposure Stub | 5% | Known LP/protocol token stub |

## Evidence Rules

- Every top risk must have one or more `evidenceIds`.
- Every suggested action must have one or more `evidenceIds`.
- Duplicate `evidenceId` values are blocked.
- Missing evidence references raise `EvidenceBindingError`.
- Evidence hashes are recomputed deterministically from canonical evidence payloads.
- Bundle hash is computed from sorted evidence hashes.

## UNKNOWN Circuit Breaker

If critical scan fields are unavailable, the assessment enters:

- `dataStatus = PARTIAL_OR_UNKNOWN`
- `decisionType = SIMULATE_ONLY`
- `riskLevel != Low`

This preserves the product rule that missing data is unknown, not safe.

## Current Demo Evaluation

For `high_risk_wallet`:

| Field | Value |
|---|---|
| Risk level | High |
| Wallet risk score | 59.75 |
| Data status | `PARTIAL_OR_UNKNOWN` |
| Top risks | approval, transfer, rwa_yield |
| Evidence count | 6 |

The static frontend mock still displays the PRD demo score of 68. The Day 4 kernel is now the executable source of truth for computed scores; Day 5 can decide whether to align mock copy to the kernel or preserve the PRD demo number for storytelling.

## Day 4 Acceptance

- Risk harness covers thresholds, red flags, transfer floor, evidence binding, UNKNOWN state, and deterministic hashes.
- Evidence harness blocks orphan claims.
- High-risk fixture produces approval, transfer, and RWA/yield top risks.
