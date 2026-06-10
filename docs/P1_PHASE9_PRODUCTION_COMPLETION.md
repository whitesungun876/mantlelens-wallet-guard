# P1 Phase 9 Production Hardening Completion

Date: 2026-06-08

## Status

Overall status: Conditional PASS, upgraded from the previous P1 foundation state.

This phase closes the main production-readiness gaps in code paths and tests:

- Durable risk trend history and alerts
- Provider-ready transaction simulation
- NFT ApprovalForAll indexed detection
- GoPlus malicious address and approval security clients
- Real manual revoke wallet flow
- Provider configuration smoke gate
- Stronger no-fake-chain-transaction safety checks

Full production PASS still requires real provider credentials and live wallet runs in the deployment environment.

## Changes

| Area | Implementation | Acceptance Evidence |
| --- | --- | --- |
| Durable risk trend history | `SQLiteTrendStore` in `backend/mantlelens/trend.py`; default DB `MANTLELENS_STATE_DB=data/mantlelens.sqlite3`; memory mode via `MANTLELENS_DISABLE_PERSISTENCE=true` | `test_sqlite_trend_persists_across_store_instances` |
| Durable alerts | `SQLiteAlertStore` in `backend/mantlelens/alerts.py` with persisted open/resolved alerts | `test_sqlite_alert_resolution_persists` |
| Provider config smoke | `scripts/qa_provider_config_smoke.sh`; included in `scripts/qa_all.sh` | Prints provider status and fails under `REQUIRE_FULL_P1=true` when full P1 config is missing |
| Real tx simulation provider path | `simulate_transaction()` now calls configured `TX_SIMULATION_RPC_URL` / `TENDERLY_SIMULATION_RPC_URL` using `tenderly_simulateTransaction` shape; no broadcast | `test_transaction_simulation_calls_configured_provider_without_broadcast`, `test_transaction_simulation_provider_error_is_unknown_not_safe` |
| NFT approval detection | Etherscan/MantleScan paginated `ApprovalForAll` logs through `nft_approval_for_all_logs_paginated`; optional RPC `isApprovedForAll` confirmation | `test_nft_approval_for_all_logs_are_paginated` |
| GoPlus full security | GoPlus token, malicious address, and approval security clients; enhancement output includes address/approval signals when configured | `test_goplus_full_security_clients_use_address_and_approval_endpoints` |
| Manual revoke flow | P1 prepared a manual revoke request path, but P2.5 supersedes the UI with review-only `Manual Revoke Review` / `Review request`; no browser wallet signing or broadcast is exposed in the demo UI | `tests.test_p2_final_demo_qa` confirms `eth_sendTransaction`, wallet account request, chain switch, and legacy `Send to wallet` text are absent |
| Fake tx hardening | Removed `mock_outcome_*`; lint now rejects `mock_tx_` and `mock_outcome_` in backend code | `./scripts/qa_lint.sh` |
| Generated state hygiene | Added `.gitignore` for SQLite state, pycache, frontend dist, and node modules | Local state no longer pollutes deliverables |

## Environment Variables

New or reinforced variables:

```text
MANTLELENS_STATE_DB=data/mantlelens.sqlite3
MANTLELENS_DISABLE_PERSISTENCE=false
TX_SIMULATION_PROVIDER=tenderly_rpc
TX_SIMULATION_RPC_URL=
TENDERLY_SIMULATION_RPC_URL=
TX_SIMULATION_RPC_METHOD=tenderly_simulateTransaction
TX_SIMULATION_TIMEOUT_SEC=5
```

Full production gate:

```bash
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
```

In the current environment, the config smoke result is still conditional:

```text
mantleRpc: configured
moralis: missing_or_disabled
etherscanV2_or_mantlescan: missing_or_disabled
goPlus: missing_or_disabled
assessmentLogger: missing_or_disabled
txSimulation: missing_or_disabled
conditional provider config ok
```

## External API Basis

The provider-ready paths follow current official/API-owner documentation:

- Moralis wallet history: `https://docs.moralis.com/data-api/evm/wallet/wallet-history`
- Etherscan V2 logs and unified `chainid` API: `https://docs.etherscan.io/api-reference/endpoint/getlogs` and `https://docs.etherscan.io/etherscan-v2`
- GoPlus token, malicious address, and approval security APIs: `https://docs.gopluslabs.io/`
- Tenderly Node RPC simulation using `tenderly_simulateTransaction`: `https://docs.tenderly.co/`

## QA Results

Latest command:

```bash
./scripts/qa_all.sh
```

Result:

```text
p1 qa all ok
```

Detailed results:

| Check | Result |
| --- | --- |
| Lint | PASS |
| Typecheck | PASS |
| Unit tests | PASS, 63 tests |
| Integration tests | PASS, 42 tests |
| Frontend build | PASS |
| Replay smoke | PASS, stable/elevated/critical match PRD 20 |
| Provider config smoke | PASS as Conditional |
| Live smoke | PASS, returned in about 1s with explicit partial/unavailable status |
| Browser smoke | PASS, Phase 9 UI checks all true |

Browser screenshot:

```text
/tmp/mantlelens_phase9_browser_smoke.png
```

## Remaining Conditions For Full Production PASS

These are no longer missing code paths, but they still require real environment validation:

- Enable Moralis balance/history switches with `MORALIS_API_KEY` where Mantle coverage is supported.
- Configure `ETHERSCAN_V2_API_KEY` or `MANTLESCAN_API_KEY` and run live approval/transfer/NFT log cases.
- Configure `GOPLUS_API_KEY` and verify token/address/approval security live responses.
- Deploy `AssessmentLogger`, set `ASSESSMENT_CONTRACT_ADDRESS`, private key, and signing dependencies, then verify real `assessmentTx`.
- Configure `TENDERLY_SIMULATION_RPC_URL` or `TX_SIMULATION_RPC_URL`, then verify real simulation output.
- Run live manual revoke only with a test wallet and user wallet confirmation.

## Final Verdict

P1 is now code-complete for the planned production-hardening layer and remains Conditional PASS until real provider credentials and contract deployment are verified. Demo/foundation acceptance is PASS; full production acceptance should be granted only after the full provider config gate and live wallet smoke pass.
