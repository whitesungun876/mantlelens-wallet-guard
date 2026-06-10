# P2 Assessment Commit And Live Scan

Date: 2026-06-09

Scope: P2.1 and P2.2 only. This pass productizes the AssessmentLogger commit flow and tightens live wallet scan data integrity. It does not start the broader frontend refactor, trend work, alerts work, or other P2 feature expansion.

## P2.1 API Contract

### POST `/api/assessment/commit`

Request:

```json
{
  "assessment": {},
  "simulation": null,
  "recordMode": "local_only",
  "confirmationReceived": true,
  "idempotencyKey": "idem_unique_user_action"
}
```

Required behavior:

| Field | Behavior |
| --- | --- |
| `assessment` | Required `WalletRiskAssessment` from `/api/wallet/scan`. |
| `recordMode` | Defaults to `local_only`; `onchain` is accepted only for live assessments. |
| `confirmationReceived` | Must be `true`; missing or false is rejected. |
| `idempotencyKey` | Required non-empty string; repeated keys return the existing record. |

Response record includes:

```json
{
  "status": "recorded",
  "commitMode": "onchain",
  "requestedRecordMode": "onchain",
  "chainId": 5003,
  "networkName": "Mantle Sepolia",
  "contractAddress": "0x88507ca2ebcf3c3469fbd6b1085b01b6c147c06c",
  "assessmentTx": "0x...",
  "explorerUrl": "https://sepolia.mantlescan.xyz/tx/0x...",
  "onchainRecordAvailable": true,
  "onchainWriteAttempted": true,
  "unavailableReason": null,
  "retryReason": null,
  "realExecutionAllowed": false
}
```

Unavailable recorder response:

```json
{
  "status": "pending_unavailable",
  "commitMode": "onchain_unavailable",
  "chainId": 5003,
  "networkName": "Mantle Sepolia",
  "assessmentTx": null,
  "explorerUrl": null,
  "onchainRecordAvailable": false,
  "onchainWriteAttempted": false,
  "unavailableReason": "ASSESSMENT_CONTRACT_ADDRESS/ASSESSMENT_LOGGER_ADDRESS is not configured"
}
```

Safety constraints:

- Scan never commits.
- Page load never commits.
- Tests clear signer and contract env vars or mock recorder behavior by default.
- `recordMode=local_only` never signs or broadcasts, even when real recorder env is configured.
- Real commit requires explicit `recordMode=onchain`, `confirmationReceived=true`, and a live assessment.
- Private keys and raw `.env` values are never returned by status or commit APIs.
- Failed commits return `pending_retry` / `pending_unavailable`; no mock tx hash is fabricated.

Frontend behavior:

- On-chain Record panel shows recorder status, chain/network, contract link, last commit status, and tx hash only after success.
- `Record assessment on-chain` is disabled until a scan result exists and disabled when recorder is unavailable or mocked.
- Before sending, the UI confirmation text is:

```text
This writes an assessment hash to Mantle Sepolia and spends testnet MNT gas. It does not revoke, swap, trade, or sign any wallet action.
```

## P2.2 Live Scan Integrity

Live scan response separates:

- native MNT balance
- token inventory
- approvals
- transfers
- source statuses
- evidence records
- risk claims

Integrity requirements:

- Every top risk has `evidenceIds`.
- Every top-risk evidence id must exist in `evidenceBundle.evidence`.
- Demo/replay risk evidence also resolves to detail panel data in inventory, approvals, or transfers.
- Missing indexed data is surfaced as `partial`, `unavailable`, `unknown`, or `source_failed`.
- Missing indexed data is never interpreted as safe.

Source-aware empty states:

```text
No approval history returned from configured source. Unknown, not safe.
No transfer history returned from configured source. Unknown, not safe.
No inventory returned from configured source. Unknown, not safe.
```

## Verification

Commands run:

```bash
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
python3 -m unittest tests.test_p2_live_commit_integrity -v
./scripts/qa_all.sh
```

Results:

- Provider config smoke: PASS, all P1 providers including AssessmentLogger and tx simulation configured.
- P2 focused tests: PASS, 6 tests.
- Full QA: PASS.
- Full QA covered lint, typecheck, unit tests, integration tests, frontend build, replay smoke, P2 local-only smoke, provider smoke, live smoke, and browser smoke.
- Replay smoke remains PRD 20 aligned:
  - `stable_wallet`: `Low / SAFE / NO_ACTION`
  - `elevated_wallet`: `High / REVIEW_APPROVAL / SIMULATE_REVOKE_APPROVAL`
  - `critical_wallet`: `Critical / PAUSE / REVIEW_APPROVAL`

Browser smoke:

- Demo replay high-risk scan: PASS.
- Evidence resolves to detail panel data: PASS.
- Demo On-chain Record button: disabled, no auto-commit.
- Live Mantle Sepolia scan: PASS.
- Live indexed data: `PARTIAL_OR_UNKNOWN`, with unknown/not-safe messaging.
- Live On-chain Record button: enabled only after live scan with configured recorder.
- Explicit confirmed on-chain commit: PASS.
- Successful tx: `0x059dbff480c7ea6193907f2dbc6923db5fa886d252fa2e4ce16fdba2dac01e54`
- Explorer: `https://sepolia.mantlescan.xyz/tx/0x059dbff480c7ea6193907f2dbc6923db5fa886d252fa2e4ce16fdba2dac01e54`

## Known Caveats

- Moralis / Mantlescan coverage on Mantle Sepolia may be partial or unavailable for some wallets.
- Missing indexed approvals, transfers, or inventory is unknown, not safe.
- GoPlus clean signals remain advisory; they are not a guarantee of wallet safety.
- The app records assessment hashes only; it does not revoke, swap, trade, or sign wallet actions.
- A first manual commit smoke exposed a checksum-address signing issue; the UI safely returned `pending_retry`. The sender now signs with a checksum contract address and the successful tx above was produced after the fix.

## Remaining Before P2.3

- Add contract readback verification after successful commit.
- Persist richer assessment snapshots for later audit and replay.
- Decide whether P2.3 should start with trend/alerts or a narrower commit-readback loop.
