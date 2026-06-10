# P1 Phase 8 Final QA Report

Date: 2026-06-08

## Executive Summary

P1 Overall Status: Conditional PASS

The repo now has runnable Phase 8 QA coverage for lint, typecheck, unit tests, integration tests, frontend build, replay smoke, live smoke, browser smoke, and a single all-in-one QA entrypoint. The implemented P1 foundation and demo acceptance path are green. Full production P1 remains conditional on configured live providers, on-chain assessment logger deployment/signing configuration, and external real transaction simulation coverage.

## Acceptance Scope

This verdict follows `docs/P1_ACCEPTANCE_SCOPE.md`:

- P1 foundation can be accepted when local/demo paths, live-safe fallbacks, explicit source availability, and tests are present.
- P1 full can only be claimed after provider-backed live coverage is verified with configured keys and provider-shaped data.
- Demo/replay capability is not presented as complete live capability.

## QA Scripts

| Area | Script / Command | Result | Notes |
| --- | --- | --- | --- |
| Lint | `./scripts/qa_lint.sh` | PASS | Python compile check plus safety text checks; output `lint ok`. |
| Typecheck | `./scripts/qa_typecheck.sh` | PASS | Runs `npm run typecheck` in `frontend/app`. |
| Unit tests | `./scripts/qa_unit.sh` | PASS | `Ran 57 tests ... OK`. |
| Integration tests | `./scripts/qa_integration.sh` | PASS | `Ran 36 tests ... OK`. |
| Frontend build | `./scripts/qa_build.sh` | PASS | Vite build produced `frontend/app/dist`. |
| Replay smoke | `./scripts/qa_replay_smoke.sh` | PASS | Stable/Elevated/Critical match PRD 20 mappings. |
| Live smoke | `./scripts/qa_live_smoke.sh` | PASS | `live smoke ok: 1.00s PARTIAL_OR_UNKNOWN ['available', 'unavailable']`. |
| Browser smoke prerequisites | `./scripts/qa_browser_smoke.sh` | PASS | Backend health, frontend page, scan API, and enhancement API passed. |
| All QA | `./scripts/qa_all.sh` | PASS | Completed with `phase8 qa all ok`. |

Frontend package scripts now exist in `frontend/app/package.json` for `lint`, `typecheck`, `build`, and `preview`.

## Replay Results

| Fixture | Expected | Actual | Status |
| --- | --- | --- | --- |
| `stable_wallet` | `Low / SAFE / NO_ACTION` | `Low / SAFE / NO_ACTION` | PASS |
| `elevated_wallet` | `High / REVIEW_APPROVAL / SIMULATE_REVOKE_APPROVAL` | `High / REVIEW_APPROVAL / SIMULATE_REVOKE_APPROVAL` | PASS |
| `critical_wallet` | `Critical / PAUSE / REVIEW_APPROVAL` | `Critical / PAUSE / REVIEW_APPROVAL` | PASS |

## Browser Smoke

URL checked: `http://127.0.0.1:5173/`

Visible UI checks all passed:

- Dashboard score/risk/confidence/top risks
- Data Completeness Banner
- Approval risk and suspicious transfer evidence
- Portfolio Exposure and RWA/Yield Risk
- Evidence details and suggested simulation-only actions
- On-chain Record
- Benchmark History
- Agent Identity / ERC-8004 / MCP
- Compliance disclaimer
- P1 Enhancement Modules: NFT approvals, manual revoke preparation, DeFi parsing, GoPlus full signals, transaction simulation, social share card, reputation feedback

Screenshot: `/tmp/mantlelens_phase8_browser_smoke.png`

## API And Data Source Readiness

| Requirement | Evidence | Status | Notes |
| --- | --- | --- | --- |
| P0/P1 API surface | `backend/mantlelens/server.py` routes for scan, balances, approvals, transfers, exposure, data availability, risk evaluation, explain, simulation, assessment commit/outcome, benchmark, protocol, MCP, and P1 enhancement endpoints | PASS | Routes return non-404 tested payloads. |
| Mantle RPC | `backend/mantlelens/config.py`, `backend/mantlelens/live_adapters.py`, `./scripts/qa_live_smoke.sh` | PASS | Public RPC read path and fallback status are verified under 15s. |
| GoPlus | `backend/mantlelens/live_adapters.py`, `backend/mantlelens/enhancements.py`, `test_goplus_clean_result_is_signal_not_safety_claim` | PASS | Advisory signal only; no guaranteed safety claim. |
| Moralis balances/history | `.env.example`, `config.py`, `live_adapters.py`, Moralis switch tests | Conditional PASS | Hooks and switches exist; disabled by default for Mantle Data API coverage. |
| Etherscan V2 / Mantlescan | `.env.example`, `live_adapters.py`, pagination tests | Conditional PASS | Paginated path exists when a key is configured. |
| Assessment logger | `contracts/AssessmentLogger.sol`, `backend/mantlelens/onchain.py`, Phase 2/3 tests | Conditional PASS | Real tx only when contract, private key, RPC, and optional signing dependencies are configured; no mock tx hash. |
| Real transaction simulation | `POST /api/simulation/transaction`, Phase 7 tests | Conditional PASS | Local precheck/fallback exists; external simulator provider is still a production condition. |

## Evidence And Safety

Current tests verify:

- Top risks/actions are evidence-bound.
- Approval evidence includes active allowance confirmation.
- Suspicious transfers carry transfer evidence / tx hash where available.
- Missing indexed data is treated as unknown, not safe.
- GoPlus clean output is advisory only.
- Simulation outputs are explicitly simulation-only.
- No P1 foundation endpoint auto-revokes, signs, broadcasts, swaps, trades, or gives investment advice.
- Missing on-chain config returns `pending_unavailable` and `assessmentTx: null`.

## Blocking Issues

Critical: None for Phase 8 / P1 foundation acceptance.

High:

- Full live P1 acceptance still needs provider-backed runs with real Moralis/Etherscan or Mantlescan/GoPlus coverage enabled in the environment.
- Full on-chain record acceptance needs a deployed `ASSESSMENT_CONTRACT_ADDRESS`, a signing key, and signing dependencies from `requirements.onchain.txt`.
- Real transaction simulation remains a local precheck until an external simulation provider is configured.

Medium:

- Risk trend and alerts are local/in-memory, not durable production storage.
- NFT approval and DeFi deep parsing support provider-shaped/supplied data and explicit fallback; complete indexed coverage is still provider-dependent.

Low:

- Browser smoke uses visible text checks; future UI copy changes should update the smoke expectations.

## Final Verdict

Can accept P1? Conditional.

The project has moved from PARTIAL to Conditional PASS for the implemented P1 foundation plus Phase 7 enhancement surface. It is acceptable for demo and foundation acceptance because all Phase 8 scripts exist and pass, replay cases match PRD 20, live smoke returns within the 15s budget with explicit source availability, and browser smoke confirms the required panels are visible.

It should not be claimed as full production P1 until live provider keys, assessment logger deployment/signing, durable history/alerts, and external transaction simulation are verified in a live environment.
