# P1 Day 5 Risk Trend History

## Status

P1 Day 5 is implemented.

## Scope

Day 5 adds local risk trend history to the scan workflow. It records one trend point after every completed wallet assessment and returns the current wallet trend from `/api/wallet/scan`.

This is an in-memory P1 demo store. It is intentionally read-only from the UI and does not create any chain transaction.

## Backend Contract

The scan response now returns:

```json
{
  "trend": {
    "walletHash": "0x...",
    "status": "available",
    "source": "in_memory_assessment_history",
    "pointCount": 2,
    "points": [],
    "delta": {}
  }
}
```

First scan behavior:

```json
{
  "status": "insufficient_history",
  "pointCount": 1,
  "delta": null
}
```

Second and later scans for the same `walletHash` return:

```json
{
  "status": "available",
  "delta": {
    "scoreDelta": 0.0,
    "dataConfidenceDelta": 0.0,
    "riskLevelChanged": false,
    "newTopRiskIds": []
  }
}
```

## Trend Point Fields

Each point stores:

| Field | Purpose |
|---|---|
| `assessmentId` | Source assessment identity |
| `timestamp` | Assessment timestamp |
| `walletRiskScore` | Score at scan time |
| `riskLevel` | Risk level at scan time |
| `dataConfidence` | Data confidence at scan time |
| `dataStatus` | `FULL` or `PARTIAL_OR_UNKNOWN` |
| `assessmentHash` | Hash binding for the assessment |
| `evidenceBundleHash` | Hash binding for evidence |
| `topRiskIds` | Current top-risk ids |
| `trendPointHash` | Stable hash for the trend point |

## Implementation Notes

- `backend/mantlelens/trend.py` owns the thread-safe in-memory store.
- `WalletGuardRunner` accepts an optional `trend_store` for test isolation.
- The default runner uses the global `TREND_STORE`, so HTTP scans accumulate history while the server process is alive.
- A `risk_trend_recorded` trace event is appended after the scan reaches `SIMULATION_READY`.
- Trend delta is calculated newest-vs-previous for the same wallet only.

## Frontend Behavior

The API workspace now includes a `Risk Trend` panel.

It shows:

- `insufficient_history` on the first scan for a wallet.
- Score delta and risk-level stability/change after at least two scans.
- The newest four trend points.
- The source `assessmentHash` for each point.

## Acceptance Criteria

| Check | Status |
|---|---|
| First scan returns `trend.status = "insufficient_history"` | Pass |
| Second scan for same wallet returns `trend.status = "available"` | Pass |
| Trend points are keyed by `walletHash` | Pass |
| Trend points include `assessmentHash` | Pass |
| Trend points include `evidenceBundleHash` | Pass |
| Delta includes score change | Pass |
| Delta includes risk-level change flag | Pass |
| Delta includes newly introduced top-risk ids | Pass |
| Workspace renders a trend panel | Pass |
| No real revoke or transaction execution added | Pass |

## Day 6 Handoff

Day 6 should add alerts on top of the Day 5 trend data:

1. Add local alert rule engine.
2. Create alerts for score increase, risk-level increase, new active approvals, suspicious transfers, token security risk, and source unavailability.
3. Bind every alert to evidence ids or `assessmentHash`.
4. Suppress duplicate open alerts for the same wallet/risk/evidence.
5. Render alerts in the workspace.
