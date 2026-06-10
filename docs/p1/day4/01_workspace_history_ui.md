# P1 Day 4 Workspace History UI

## Status

P1 Day 4 is implemented.

## Scope

Day 4 exposes the Day 2 / Day 3 live data fields in the existing API workspace.

The current single-file workspace now renders:

- `historyOptions` controls for live scans.
- `inventory.tokens`.
- `coverage.pageCoverage`.
- `history.approvalHistory.items`.
- `history.transferHistory.items`.

The formal React/Vite frontend is still reserved for later P1 work.

## UI Controls

The scan panel now includes:

| Control | Applies To | Sent Field |
|---|---|---|
| Page size | live mode only | `historyOptions.pageSize` |
| Max pages | live mode only | `historyOptions.maxPages` |

When `dataMode = "demo"`, these controls are disabled and no `historyOptions` are sent.

When `dataMode = "live"`, the workspace sends:

```json
{
  "historyOptions": {
    "pageSize": 10,
    "maxPages": 2,
    "fromBlock": 1,
    "toBlock": "latest",
    "sort": "desc"
  }
}
```

## New Panels

| Panel | Data Source | Behavior |
|---|---|---|
| Inventory | `inventory.tokens` | Shows symbol, balance, token address, source, and security status |
| Page Coverage | `coverage.pageCoverage` | Shows fetched pages, row count, page size, block range, and `hasMore` status |
| Approval History | `history.approvalHistory.items` | Shows token, spender, block, active/inactive status, and unlimited flag |
| Transfer History | `history.transferHistory.items` | Shows token, direction, amount, pattern, block, and counterparty |

## Compatibility

Demo / replay mode still works:

- `inventory` may be `null`.
- `history` may be `null`.
- `pageCoverage` may be empty.
- Existing risk, evidence, explanation, simulation, commit, benchmark, and events panels remain unchanged.

## Acceptance Criteria

| Check | Status |
|---|---|
| Live page size control exists | Pass |
| Live max pages control exists | Pass |
| Demo mode disables history controls | Pass |
| Live mode enables history controls | Pass |
| Scan request sends `historyOptions` only in live mode | Pass |
| Inventory panel renders live inventory | Pass |
| Page Coverage panel renders page metadata | Pass |
| Approval History panel renders approval rows | Pass |
| Transfer History panel renders transfer rows | Pass |
| Demo mode continues to render P0 assessment | Pass |
| No real revoke or transaction execution added | Pass |

## Browser Verification Targets

Expected demo state:

```text
health = ok · demo+p1-live-ready · day 11
dataMode = demo
riskLevel = High
pageSizeDisabled = true
maxPagesDisabled = true
inventoryRows = 0
pageCoverageRows = 0
```

Expected live state with the sample wallet:

```text
dataMode = live
pageSizeDisabled = false
maxPagesDisabled = false
pageCoverageRows >= 3
inventoryRows >= 1
approvalRows >= 0
transferRows >= 0
```

## Day 5 Handoff

Day 5 should start risk trend history:

1. Add an in-memory assessment history store.
2. Store assessment snapshots by `walletHash`.
3. Return `trend.status = "insufficient_history"` for the first scan.
4. Return trend points and delta after two scans.
5. Keep trend entries bound to `assessmentHash` and `evidenceBundleHash`.
