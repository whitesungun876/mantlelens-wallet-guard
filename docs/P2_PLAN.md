# P2 Plan

Date: 2026-06-09

## Scope

P2 starts after P1 live provider enablement and AssessmentLogger deployment.

Current implementation scope is limited to:

| Item | Goal | Status |
|---|---|---|
| P2.1 Productize AssessmentLogger commit flow | Explicit, user-triggered commit API with safe recorder selection. | Implemented |
| P2.2 Live scan data integrity | Evidence-bound live scan response with partial/source-failed data surfaced as unknown, not safe. | Implemented |

Frontend refactor is intentionally out of scope. The current UI only adds a minimal button label distinction: demo scans record locally; live scans request on-chain recording.

## API Contract: POST `/api/assessment/commit`

### Request

```json
{
  "assessment": {},
  "simulation": null,
  "recordMode": "local_only",
  "confirmationReceived": true,
  "idempotencyKey": "idem_unique_user_action"
}
```

| Field | Required | Values | Notes |
|---|---:|---|---|
| `assessment` | yes | `WalletRiskAssessment` | Must contain assessment hashes and wallet fields produced by `/api/wallet/scan`. |
| `simulation` | no | object or null | Optional simulation-only result hash binding. |
| `recordMode` | no | `local_only`, `onchain` | Defaults to `local_only`. Real AssessmentLogger write only happens for `onchain`. |
| `confirmationReceived` | yes | `true` | Missing or false is rejected. |
| `idempotencyKey` | yes | non-empty string | Missing or empty is rejected. |

### Response

```json
{
  "record": {
    "assessmentId": "assessment_live_...",
    "assessmentHash": "0x...",
    "assessmentTx": null,
    "explorerUrl": null,
    "status": "recorded_local",
    "commitMode": "local_only",
    "requestedRecordMode": "local_only",
    "onchainRecordAvailable": false,
    "onchainWriteAttempted": false,
    "realExecutionAllowed": false
  },
  "trace": {}
}
```

### Safety Rules

- `recordMode=local_only` never signs or sends a transaction, even if `.env` contains a valid private key.
- `recordMode=onchain` is accepted only for `assessment.dataMode == "live"`.
- `recordMode=onchain` uses `AssessmentRecorder.from_env()` and may return `recorded`, `pending_retry`, or `pending_unavailable`.
- Tests and QA scripts clear on-chain private-key env vars or inject unavailable/mock recorders by default.
- `PRIVATE_KEY` and `WALLET_PRIVATE_KEY` must never be printed by scripts or tests.

## API Contract: POST `/api/wallet/scan` Live Response

Live request:

```json
{
  "dataMode": "live",
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "includeExplanation": false,
  "historyOptions": {
    "pageSize": 10,
    "maxPages": 1,
    "fromBlock": 1,
    "toBlock": "latest",
    "sort": "desc"
  }
}
```

Response keeps the P1 shape and adds:

```json
{
  "coverage": {
    "dataStatus": "PARTIAL_OR_UNKNOWN",
    "missingDataIsSafe": false,
    "sourceAvailability": {}
  },
  "integrity": {
    "schemaVersion": "mantlelens.scan_integrity.v1",
    "evidenceBinding": {
      "status": "pass",
      "evidenceCount": 2,
      "topRiskCount": 1,
      "suggestedActionCount": 1,
      "orphanClaimCount": 0,
      "orphanClaims": []
    },
    "sourceIntegrity": {
      "status": "partial",
      "missingDataIsSafe": false,
      "partialSources": ["moralis"],
      "unavailableSources": [],
      "sourceFailures": [
        {
          "source": "moralis",
          "status": "partial",
          "limitation": "indexed data partial or unavailable"
        }
      ],
      "incompleteData": ["fullTokenInventory", "transactionHistory"]
    },
    "topRiskEvidenceBound": true,
    "commitEligibility": {
      "localRecordAllowed": true,
      "onchainRecordAllowed": true,
      "reason": "live assessment with evidence-bound claims"
    }
  }
}
```

Integrity requirements:

- Every `assessment.topRisks[].evidenceIds[]` must exist in `evidenceBundle.evidence[]`.
- Every suggested action must have evidence ids.
- Approval evidence must expose `allowanceConfirmed`.
- Transfer evidence must expose `txHash`.
- Missing indexed data is surfaced through `coverage.dataStatus`, `coverage.missingDataIsSafe=false`, and `integrity.sourceIntegrity`.
- GoPlus clean signals remain advisory and must not imply guaranteed safety.

## Verification

Implemented tests:

```bash
python3 -m unittest tests.test_p2_live_commit_integrity -v
```

HTTP smoke:

```bash
./scripts/qa_p2_smoke.sh
```

Full QA:

```bash
./scripts/qa_all.sh
```

Expected P2 smoke summary:

```json
{
  "commitMode": "local_only",
  "dataMode": "live",
  "evidenceBinding": "pass",
  "onchainWriteAttempted": false,
  "sourceIntegrity": "partial"
}
```

## Next P2 Candidates

- Add a dedicated commit confirmation modal with chain, contract, assessment hash, and gas warning.
- Add persisted server-side assessment snapshots before on-chain commits.
- Add contract readback verification after `assessmentTx`.
- Add UI surface for `integrity.sourceIntegrity.sourceFailures`.
