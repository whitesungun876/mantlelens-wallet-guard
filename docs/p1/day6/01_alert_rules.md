# P1 Day 6 Alerts

## Status

P1 Day 6 is implemented.

## Scope

Day 6 adds local open-alert generation to the wallet scan workflow.

Alerts are local review signals only. They do not trigger revoke, swap, transfer, trade, or transaction broadcast.

## Backend Contract

`/api/wallet/scan` now returns an `alerts` array:

```json
{
  "alerts": [
    {
      "alertId": "alert_...",
      "walletHash": "0x...",
      "assessmentId": "assessment_...",
      "alertType": "new_active_approval",
      "severity": "High",
      "status": "open",
      "title": "New active approval detected",
      "message": "USDT has an active approval to an unknown spender.",
      "evidenceIds": ["ev_..."],
      "sourceAssessmentHash": "0x...",
      "relatedAssessmentHashes": [],
      "dedupeKey": "0x...",
      "createdAt": "2026-06-08T00:00:00+00:00",
      "resolvedAt": null,
      "lastSeenAt": null,
      "lastSeenAssessmentHash": null,
      "occurrenceCount": 1
    }
  ]
}
```

## Alert Types

| Alert Type | Trigger | Binding |
|---|---|---|
| `new_active_approval` | Top risk has `type = approval` | Risk evidence ids and assessment hash |
| `suspicious_transfer_detected` | Top risk has `type = transfer` | Risk evidence ids and assessment hash |
| `risk_score_increased` | Trend `scoreDelta > 0` | Previous/current assessment hashes |
| `risk_level_increased` | Trend current risk level ranks above previous | Previous/current assessment hashes |
| `token_security_risky` | Inventory or security row has `securityStatus/status = risky` | Token security evidence ids and assessment hash |
| `source_unavailable` | Data completeness or source availability is `unavailable` | Assessment hash |

## Deduplication

The local store suppresses duplicate open alerts by `dedupeKey`.

When the same open alert is seen again:

- The original `alertId` is reused.
- `occurrenceCount` increments.
- `lastSeenAt` is updated.
- `lastSeenAssessmentHash` is updated.

Resolution is not implemented yet; all Day 6 alerts are open local records.

## Implementation Notes

- `backend/mantlelens/alerts.py` owns alert rules and the in-memory open-alert store.
- `WalletGuardRunner` accepts an optional `alert_store` for test isolation.
- The default runner uses the global `ALERT_STORE`, so HTTP scans preserve open alerts while the server process is alive.
- A `alerts_evaluated` trace/core event is appended after trend generation.
- Every candidate must be bound to evidence ids, source assessment hash, or related assessment hashes.

## Frontend Behavior

The API workspace now includes an `Alerts` panel.

It shows:

- Alert title and severity.
- Human-readable message.
- Open status and occurrence count.
- Evidence ids when available, otherwise the source assessment hash.

## Acceptance Criteria

| Check | Status |
|---|---|
| Scan response returns alerts array | Pass |
| Active approval alert is generated | Pass |
| Suspicious transfer alert is generated | Pass |
| Source unavailable alert is generated | Pass |
| Trend score increase alert is generated | Pass |
| Trend risk-level increase alert is generated | Pass |
| Risky token security alert is generated | Pass |
| Duplicate open alerts reuse `alertId` | Pass |
| Duplicate open alerts increment `occurrenceCount` | Pass |
| Alerts bind to evidence ids or assessment hashes | Pass |
| Workspace renders alerts | Pass |
| No real revoke or transaction execution added | Pass |

## Day 7 Handoff

Day 7 can continue with one of these P1 tracks:

1. Persist trend and alerts to a local JSON/SQLite store.
2. Add alert resolution APIs.
3. Add richer benchmark cases that exercise alert transitions.
4. Start the formal React/Vite frontend migration.
