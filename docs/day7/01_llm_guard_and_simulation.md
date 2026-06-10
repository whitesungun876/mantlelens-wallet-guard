# Day 7 LLM Guard And Simulation

## Goal

Day 7 adds the LLM safety boundary and simulation-only risk diff. The system can now accept a model-like explanation candidate, validate it against structured risks and evidence, and fall back to rule-based explanation when unsupported claims appear.

## Code

| File | Purpose |
|---|---|
| `backend/mantlelens/llm_guard.py` | Validates candidate explanation claims against assessment and evidence |
| `backend/mantlelens/simulation.py` | Produces approval and portfolio simulation-only before/after diffs |
| `frontend/api-workspace.html` | Adds guarded explanation check and simulation diff controls |
| `tests/test_day7_day8_simulation_ledger.py` | Day 7 LLM guard and simulation harness |

## LLM Guard

The guard checks:

- Claim text must match a structured top-risk claim.
- Every claim must include evidence ids.
- Evidence ids must exist in the current evidence bundle.
- Forbidden phrases are blocked, including guaranteed safety, complete scan, real revoke executed, real swap executed, and mETH is RWA.

If validation fails, the response falls back to `rule_fallback` and returns `guardFailures`.

## Simulation

Implemented simulation types:

| Endpoint | Simulation | Guarantee |
|---|---|---|
| `/api/simulation/approval` | `approval_revoke_impact` | No revoke transaction is created |
| `/api/simulation/portfolio` | `portfolio_adjustment` | No trade transaction is created |

Both return:

- `executionMode = simulation_only`
- `transactionCreated = false`
- before score and subScores
- after score and subScores
- `scoreDelta`
- evidence ids
- deterministic simulation hash

## Day 7 Acceptance

- LLM guard accepts evidence-grounded claims.
- LLM guard rejects unsupported claims and falls back.
- Simulation lowers relevant scores.
- Simulation never creates a transaction.
- Frontend can run approval and portfolio simulation from API data.
