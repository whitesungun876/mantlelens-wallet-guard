# Day 3 / Day 4 Completion Report

## Status

Day 3 and Day 4 are complete as runnable local artifacts.

The repository now has a small Python backend package that can load fixtures, emit raw tool outputs, evaluate wallet risk, build evidence bundles, validate claim grounding, and run harness tests. No network APIs or real transactions are used.

## Day 3 Deliverables

| Deliverable | File | Status | Acceptance Evidence |
|---|---|---|---|
| Raw adapter interfaces | `backend/mantlelens/adapters.py` | Done | Implements fixture-backed P0 tools and `scan_raw` |
| Fixture loader | `backend/mantlelens/fixtures.py` | Done | Loads all demo wallet fixtures by id |
| CLI scanner | `backend/mantlelens/cli.py` | Done | Prints raw scan or evaluated assessment |
| Frontend mock hooks | `frontend/mock-hooks.js` | Done | Exposes fixture-backed scan shape for UI integration |
| Tool harness | `tests/test_day3_day4_harness.py` | Done | Day 3 tool tests pass |

## Day 4 Deliverables

| Deliverable | File | Status | Acceptance Evidence |
|---|---|---|---|
| Risk engine | `backend/mantlelens/risk.py` | Done | Produces subScores, risk level, top risks, actions, assessment hash |
| Evidence layer | `backend/mantlelens/evidence.py` | Done | Builds deterministic bundle hash and blocks orphan claims |
| Hash utilities | `backend/mantlelens/hashutil.py` | Done | Canonical JSON + SHA-256 hashes |
| Risk/evidence harness | `tests/test_day3_day4_harness.py` | Done | Day 4 risk/evidence tests pass |
| Day 4 notes | `docs/day4/01_risk_engine_and_evidence.md` | Done | Rules, UNKNOWN circuit breaker, and demo evaluation documented |

## Validation Performed

```bash
python3 -m unittest discover -s tests -v
```

Result:

```text
Ran 9 tests in 0.003s
OK
```

Additional smoke command:

```bash
python3 -m backend.mantlelens.cli high_risk_wallet
```

Observed:

```text
assessment_high_risk_wallet 59.75 High PARTIAL_OR_UNKNOWN
topRisks = approval, transfer, rwa_yield
evidenceCount = 6
```

## Acceptance Mapping

| Day | Required Acceptance | Result |
|---|---|---|
| Day 3 | 3 fixtures output balances/approvals/transfers | Pass |
| Day 3 | Tool harness started | Pass |
| Day 3 | Indexed API unavailable is partial, not safe | Pass |
| Day 3 | Active allowance confirmed before risk | Pass |
| Day 4 | Risk engine produces assessment and top risks | Pass |
| Day 4 | Every top risk has evidenceId | Pass |
| Day 4 | Evidence bundle blocks orphan claims | Pass |
| Day 4 | UNKNOWN circuit breaker tested | Pass |

## Ready For Day 5

Recommended Day 5 work:

1. Wrap `FixtureWalletAdapter.scan_raw` and `evaluate_wallet_risk` into `ScanWorkflow` and `AssessmentWorkflow`.
2. Add a minimal FastAPI route for `/api/wallet/scan` using `dataMode=demo`.
3. Add trace/run ids around adapter calls.
4. Connect `frontend/mock-hooks.js` or the static workspace to the demo scan response.
