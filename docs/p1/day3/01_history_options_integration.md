# P1 Day 3 History Options Integration

## Status

P1 Day 3 is implemented.

## Scope

Day 3 wires `historyOptions` from the scan API request through the whole live scan stack:

```text
HTTP request -> server validation -> WalletGuardRunner -> LiveWalletAdapter -> Etherscan V2 pagination
```

This makes approval history, transfer history, and transfer-derived inventory candidate depth configurable.

## Request Contract

`POST /api/wallet/scan` now accepts:

```json
{
  "dataMode": "live",
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "historyOptions": {
    "pageSize": 100,
    "maxPages": 3,
    "fromBlock": 0,
    "toBlock": "latest",
    "sort": "desc"
  }
}
```

## Validation

| Field | Rule |
|---|---|
| `historyOptions` | Must be an object when present |
| `pageSize` | Integer from 10 to 1000 |
| `maxPages` | Integer from 1 to 10 |
| `fromBlock` | Integer >= 0 |
| `toBlock` | Integer or `"latest"` |
| `sort` | `"asc"` or `"desc"` |

Invalid options return:

```json
{
  "error": "bad_request",
  "message": "Invalid historyOptions: ..."
}
```

## Propagation

`WalletGuardRunner.scan_wallet` now accepts:

```python
scan_wallet(
    fixture_id="live_wallet",
    wallet_address="0x...",
    history_options=HistoryPageOptions(page_size=100, max_pages=3),
)
```

`LiveWalletAdapter.load_scan_subject` stores the options on the live scan subject as `_historyOptions`.

The following tools use the same options:

- `getKnownTokenBalances`: `token_transfers_paginated` for token candidates.
- `getTokenApprovals`: `approval_logs_paginated`.
- `getTransferLogs`: `token_transfers_paginated`.

## Response Contract

The live response exposes the effective pagination metadata in:

```json
{
  "coverage": {
    "pageCoverage": {
      "tokenInventoryCandidates": {
        "pageSize": 100,
        "fetchedPages": 3,
        "hasMore": true,
        "fromBlock": 0,
        "toBlock": "latest",
        "rowCount": 250,
        "sort": "desc"
      },
      "approvalHistory": {},
      "transferHistory": {}
    }
  }
}
```

## Acceptance Checks

| Check | Status |
|---|---|
| API parses `historyOptions` | Pass |
| Invalid `historyOptions` returns 400 | Pass |
| Runner accepts `history_options` | Pass |
| Live adapter stores options | Pass |
| Token inventory candidate pagination uses configured options | Pass |
| Approval pagination uses configured page, offset, and block range | Pass |
| Transfer pagination uses configured page, offset, and sort | Pass |
| Page coverage appears in response | Pass |
| Fixture/demo mode remains compatible | Pass |

## Tests

New and updated tests cover:

- `EtherscanV2Client.approval_logs_paginated`.
- `EtherscanV2Client.token_transfers_paginated`.
- HTTP rejection of invalid `historyOptions`.
- Runner-to-adapter propagation of custom `HistoryPageOptions`.
- Response `coverage.pageCoverage` values.

Expected result:

```text
Ran 38 tests
OK
```

## Safety Boundary

Day 3 does not add real execution.

- Revoke is still simulation-only.
- No transaction broadcast exists.
- Page-limited data remains partial unless completeness is proven.

## Day 4 Handoff

Day 4 should use the now-configurable history pipeline to:

1. Build richer approval and transfer history response summaries.
2. Add frontend rendering for history tables in the existing workspace.
3. Add explicit page coverage UI so users can see how much history was fetched.
4. Keep `PARTIAL_OR_UNKNOWN` when pagination depth is limited or `hasMore = true`.
