# P1 Day 2 Inventory and Pagination Implementation

## Status

P1 Day 2 is implemented.

## Scope

Day 2 converts the Day 1 data contract into backend primitives:

- `TokenInventoryNormalizer`
- `InventoryOptions`
- `HistoryPageOptions`
- `PaginatedHistoryResult`
- Etherscan V2 page / offset support
- transfer-derived token candidates
- RPC-confirmed current ERC20 balances
- P1-compatible `inventory`, `history`, and `coverage.pageCoverage` fields in scan responses

## New Backend Module

`backend/mantlelens/inventory.py`

| Object | Purpose |
|---|---|
| `InventoryOptions` | Controls native/ERC20 inclusion, zero-balance handling, and candidate limits |
| `HistoryPageOptions` | Validates page size, max pages, block window, and sort order |
| `PaginatedHistoryResult` | Carries deduped rows plus page metadata |
| `TokenInventoryNormalizer` | Converts source rows into stable P1 inventory token objects |
| `dedupe_rows` | Removes duplicate indexed rows by stable key fields |

## Etherscan V2 Changes

`EtherscanV2Client` now supports:

- `token_transfers(wallet_address, page, offset, sort)`
- `token_transfers_paginated(wallet_address, HistoryPageOptions)`
- `normal_transactions(wallet_address, page, offset, sort)`
- `approval_logs(owner_address, page, offset, from_block, to_block)`
- `approval_logs_paginated(owner_address, HistoryPageOptions)`

Old `limit` usage remains compatible.

## Live Adapter Changes

`LiveWalletAdapter.get_known_token_balances` now has this source order:

1. Moralis Data API, only when explicitly enabled for a supported chain.
2. Etherscan V2 token-transfer candidates plus Mantle RPC `ERC20.balanceOf`.
3. Configured `MANTLE_KNOWN_TOKENS_JSON` fallback.
4. `unavailable` with explicit limitation.

For Mantle P1, the practical path is currently:

```text
Etherscan V2 tokentx pages -> token candidates -> Mantle RPC balanceOf -> inventory.tokens
```

## Response Additions

`WalletGuardRunner.scan_wallet` now includes:

```json
{
  "inventory": {},
  "history": {},
  "trend": null,
  "alerts": [],
  "coverage": {
    "pageCoverage": {}
  }
}
```

P0 response fields remain unchanged.

## Inventory Acceptance

| Check | Status |
|---|---|
| Native MNT is normalized as a token item | Pass |
| ERC20 candidates are deduped by lowercase token address | Pass |
| Current ERC20 balances are confirmed through Mantle RPC | Pass |
| Zero balances are excluded by default | Pass |
| Nonzero balances bind to balance evidence ids | Pass |
| Transfer-derived inventory is marked `partial`, not safe/full | Pass |

## Pagination Acceptance

| Check | Status |
|---|---|
| Page size is validated | Pass |
| Max pages is validated | Pass |
| Etherscan V2 receives `page` and `offset` | Pass |
| Results are deduped by transaction/log keys | Pass |
| Page metadata includes `fetchedPages`, `hasMore`, and `rowCount` | Pass |

## Safety Boundary

No real execution was added.

- Revoke is still simulation-only.
- No transaction broadcast exists.
- Missing inventory or partial pagination keeps `PARTIAL_OR_UNKNOWN`.

## Tests

New / updated tests cover:

- Etherscan V2 paginated transfer calls.
- Token candidate dedupe.
- Transfer-derived token inventory.
- RPC current balance confirmation.
- P1 scan response includes `inventory` and `history`.

Expected result:

```text
Ran 36 tests
OK
```

## Day 3 Handoff

Day 3 should extend this foundation by:

1. Passing scan request `historyOptions` into the runner and live adapter.
2. Expanding approval pagination tests.
3. Building richer history response objects for frontend tables.
4. Adding page coverage display to the current workspace or future React app.
