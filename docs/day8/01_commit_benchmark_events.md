# Day 8 Commit, Benchmark, And Events

## Goal

Day 8 added hash commit, benchmark history, and event instrumentation. Phase 3 now keeps the record local when no assessment logger is configured and does not fabricate a transaction hash.

## Code

| File | Purpose |
|---|---|
| `backend/mantlelens/ledger.py` | In-memory idempotent assessment hash ledger |
| `backend/mantlelens/analytics.py` | Core event recorder and traceability validation |
| `backend/mantlelens/server.py` | Adds commit, benchmark, events, and simulation routes |
| `frontend/api-workspace.html` | Adds commit button, benchmark history, and event panel |
| `tests/test_day7_day8_simulation_ledger.py` | Day 8 ledger, benchmark, and event harness |

## API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/simulation/approval` | POST | Simulation-only approval diff |
| `/api/simulation/portfolio` | POST | Simulation-only portfolio diff |
| `/api/assessment/commit` | POST | Idempotent assessment hash record with optional on-chain logger |
| `/api/benchmark` | GET | Benchmark records by wallet hash |
| `/api/events` | GET | Recent instrumentation events |

## Commit Behavior

Commit requires:

- `assessment`
- `confirmationReceived = true`
- `idempotencyKey`

Commit returns:

- `status = pending_unavailable` when no assessment contract/key is configured.
- deterministic `assessmentHash`
- no fabricated `assessmentTx`
- `realExecutionAllowed = false`
- trace id

Repeated commit with the same idempotency key returns the same record.

## Event Coverage

Core events now include:

- `scan_started`
- `risk_evaluation_completed`
- `evidence_bundle_built`
- `explanation_completed`
- `simulation_completed`
- `assessment_commit_status_changed`
- `benchmark_history_viewed`

Every core event includes `runId` and `traceId`.

## Day 8 Acceptance

- Commit hash is consistent and idempotent.
- Benchmark history shows committed records.
- Core events include trace ids.
- Frontend shows simulation diff, benchmark history, and recent events.
