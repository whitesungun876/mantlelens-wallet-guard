# P2 AssessmentLogger Readback Verification

Date: 2026-06-09

Scope: P2.35 only. This pass adds read-only AssessmentLogger commit verification and creates a local project snapshot before P2.4. It does not start trend, alerts, real revoke execution, swaps, automatic signing, or a broad frontend refactor.

## Snapshot

Project directory `/Users/lola/Desktop/mantle` is not inside a Git repository. A local tar snapshot was created instead of committing.

Snapshot path:

```text
/Users/lola/Desktop/mantle/snapshots/p2_3_risk_engine_ready_20260609_113413.tar.gz
```

Snapshot excludes `.env`, `.env.*`, `node_modules`, `.venv`, build outputs, cache directories, and prior `.tar.gz` snapshots.

`.gitignore` already excludes `.env`, `.env.*`, `node_modules`, `.venv`, build/cache directories, and snapshot tarballs, so no secret-tracking change was required.

## Readback Design

Backend implementation:

- `backend/mantlelens/onchain.py`
  - `AssessmentReadbackVerifier`
  - `AssessmentVerifierConfig`
  - `verify_tx(tx_hash, expected_assessment_hash=None)`
- `backend/mantlelens/server.py`
  - `GET /api/assessment/commit/verify`
  - `_find_assessment_record(...)`

Verifier behavior:

- Uses JSON-RPC read methods only:
  - `eth_chainId`
  - `eth_getTransactionByHash`
  - `eth_getTransactionReceipt`
- Requires Mantle Sepolia chain id `5003`.
- Confirms the transaction target equals configured `ASSESSMENT_CONTRACT_ADDRESS` / `ASSESSMENT_LOGGER_ADDRESS`.
- Decodes `recordAssessment(...)` calldata when available.
- Decodes `AssessmentRecorded(...)` event when available.
- Optionally compares a supplied or locally stored assessment hash.
- Does not import a signer, read a private key, call `eth_sendRawTransaction`, or submit any transaction.

## API Contract

### GET `/api/assessment/commit/verify`

Query parameters:

| Parameter | Required | Description |
| --- | --- | --- |
| `tx_hash` / `txHash` | yes | 32-byte transaction hash to verify. |
| `assessment_id` / `assessmentId` | no | Local assessment id for matching a ledger record. |
| `assessment_hash` / `assessmentHash` | no | Expected assessment hash to compare against on-chain data. |

Response:

```json
{
  "status": "verified",
  "verificationStatus": "verified",
  "chainId": 5003,
  "networkName": "Mantle Sepolia",
  "contractAddress": "0x88507ca2ebcf3c3469fbd6b1085b01b6c147c06c",
  "txHash": "0x...",
  "explorerUrl": "https://sepolia.mantlescan.xyz/tx/0x...",
  "blockNumber": 39696633,
  "eventName": "AssessmentRecorded",
  "assessmentHash": "0x...",
  "recordId": "0x...",
  "mismatchReason": null,
  "safeError": null,
  "localAssessmentId": null,
  "localAssessmentHash": null
}
```

Status values:

| Status | Meaning |
| --- | --- |
| `verified` | Tx exists, succeeded, targets the configured AssessmentLogger, and matches calldata/event format. |
| `pending` | Tx exists but no receipt is available yet. |
| `failed` | Receipt status is failed. |
| `mismatch` | Chain, target contract, calldata/event format, or expected assessment hash does not match. |
| `unknown` | Tx cannot be found or readback cannot complete safely. |

The endpoint must not expose private keys, raw `.env`, raw RPC URLs, or API keys.

## Frontend

Minimal On-chain Record panel update:

- Shows verification status after a commit tx exists.
- Adds `Verify on-chain record`.
- The verify button calls only `GET /api/assessment/commit/verify`.
- The verify button is disabled when no commit tx hash exists.
- It does not trigger a new commit and does not ask for wallet signing.

## Safety Constraints

- Scan does not commit.
- Page load does not commit.
- Tests do not commit.
- Readback verification does not commit.
- Real commit remains manual only via explicit `/api/assessment/commit` or user confirmation.
- No real revoke, swap, trade, or automatic signing is implemented here.
- Missing indexed data remains `partial`, `unavailable`, `unknown`, or `source_failed`; it is not treated as safe.

## Verification Commands

Commands run:

```bash
python3 -m unittest tests.test_p2_assessment_readback -v
python3 -m unittest tests.test_p2_risk_engine_hardening -v
./scripts/qa_typecheck.sh
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
./scripts/qa_all.sh
```

Observed results:

- P2.35 readback tests: PASS, 8 tests.
- P2.3 risk hardening tests: PASS, 11 tests.
- Frontend typecheck: PASS.
- Provider config smoke with `REQUIRE_FULL_P1=true`: PASS.
- Full QA: PASS.
- Full QA covered lint, typecheck, unit tests, integration tests, frontend build, replay smoke, P2 smoke, provider smoke, live smoke, and browser smoke prerequisites.

Read-only live verification:

```text
tx: 0x059dbff480c7ea6193907f2dbc6923db5fa886d252fa2e4ce16fdba2dac01e54
status: verified
chain: Mantle Sepolia · 5003
contract: 0x88507ca2ebcf3c3469fbd6b1085b01b6c147c06c
event: AssessmentRecorded
block: 39696633
```

No real on-chain transaction was sent during P2.35.

## Browser Smoke

Backend and frontend were restarted:

- Backend: `http://127.0.0.1:8765`
- Frontend: `http://127.0.0.1:5173`

Demo replay high-risk wallet:

- Scan completed.
- Top risks were visible.
- Evidence tab showed matching evidence, including `ev_high_unlimited_approval`.
- On-chain Record panel did not auto-commit.
- No on-chain tx hash appeared.
- `Verify on-chain record` was disabled because no commit tx existed.

Live Mantle Sepolia wallet:

- Scan completed.
- Data status was `PARTIAL_OR_UNKNOWN`.
- Source coverage / wallet activity uncertainty risks were visible.
- Missing indexed data was presented as unknown, not safe.
- On-chain Record panel showed `Mantle Sepolia · 5003`.
- Contract link showed `0x88507ca2...47c06c`.
- `Record assessment on-chain` was available for a configured live recorder but was not clicked.
- `Verify on-chain record` was disabled because no new commit tx existed in the UI session.

## Known Caveats

- Verification requires a tx hash and a readable Mantle Sepolia RPC provider.
- Local assessment matching only works when the assessment is still in the in-memory ledger or when `assessment_hash` is supplied.
- A verified tx proves the AssessmentLogger record exists; it does not guarantee wallet safety.
- Moralis / Mantlescan coverage on Mantle Sepolia may still be partial or unavailable for some wallets.
- P2.4 trend/history/alerts work has not started in this pass.

## Remaining Before P2.4

- Decide trend and alert storage retention rules.
- Define alert deduplication and severity escalation policy for repeated scans.
- Add trend/alert browser acceptance tests after P2.4 starts.
