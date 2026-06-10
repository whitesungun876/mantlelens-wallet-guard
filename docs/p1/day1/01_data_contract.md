# P1 Day 1 Data Contract

## Status

Day 1 is complete when this contract is accepted as the implementation guide for P1.2-P1.6.

Current P1 foundation already supports:

- `dataMode: "live"` scans through `/api/wallet/scan`.
- Mantle RPC for native balance, ERC20 `balanceOf`, and active allowance confirmation.
- Etherscan V2 for indexed approval logs and token transfer history.
- GoPlus for token security after token inventory exists.
- Fixture-backed `demo` / `replay` mode as the P0 regression baseline.

This contract defines the next implementation target: complete balances inventory, paginated approval / transfer history, risk trend history, alerts, and the future React/Vite frontend data model.

## Non-Goals

- No real revoke transaction.
- No trade, swap, bridge, or transaction broadcast.
- No private key handling.
- No claim may be shown as safe if the underlying source is missing, unsupported, stale, or rate-limited.

## Source Priority

| Data | Primary Source | Confirmation Source | Fallback | Data Status Rule |
|---|---|---|---|---|
| Native MNT balance | Mantle RPC `eth_getBalance` | None | unavailable | `available` only when RPC returns a valid value |
| ERC20 token candidates | Etherscan V2 `account.tokentx` paginated history | Mantle RPC `balanceOf` | `MANTLE_KNOWN_TOKENS_JSON` | `partial` unless indexed history pages are fetched and current balances are confirmed |
| Current ERC20 balances | Mantle RPC `balanceOf` for token candidates | Etherscan V2 balance fields if available | configured known-token allowlist | `available` only for confirmed current balances |
| Approval events | Etherscan V2 `logs.getLogs` with Approval topic | Mantle RPC `allowance(owner, spender)` | unavailable | historical approvals are not current risk without active allowance confirmation |
| Transfer history | Etherscan V2 `account.tokentx` pages | None | unavailable | `available` for fetched page window; still `partial` for full-wallet lifetime history unless complete pagination is proven |
| Token security | GoPlus `token_security/{chainId}` | None | unknown token security evidence | clean result is advisory, not proof of safety |
| Risk trend | Local assessment history store | assessment hash | benchmark ledger | `available` after at least 2 scans for same wallet |
| Alerts | Local alert rule engine | assessment / evidence ids | none | alerts must bind to source evidence or assessment hashes |

## Request Contract

### POST `/api/wallet/scan`

Existing fields remain valid.

```json
{
  "dataMode": "live",
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "includeExplanation": true,
  "inventoryOptions": {
    "includeNative": true,
    "includeErc20": true,
    "includeZeroBalances": false,
    "maxTokenCandidates": 250
  },
  "historyOptions": {
    "includeApprovals": true,
    "includeTransfers": true,
    "fromBlock": 0,
    "toBlock": "latest",
    "pageSize": 100,
    "maxPages": 5
  },
  "riskOptions": {
    "includeTrend": true,
    "includeAlerts": true
  }
}
```

Defaults:

- `inventoryOptions.includeNative = true`
- `inventoryOptions.includeErc20 = true`
- `inventoryOptions.includeZeroBalances = false`
- `inventoryOptions.maxTokenCandidates = 250`
- `historyOptions.includeApprovals = true`
- `historyOptions.includeTransfers = true`
- `historyOptions.pageSize = 100`
- `historyOptions.maxPages = 3`
- `riskOptions.includeTrend = false` until trend store is implemented
- `riskOptions.includeAlerts = false` until alert store is implemented

Validation:

- `walletAddress` must match `^0x[a-fA-F0-9]{40}$`.
- `dataMode` must be one of `demo`, `replay`, `live`.
- `maxPages` must be between `1` and `10`.
- `pageSize` must be between `10` and `1000`.
- Invalid requests return `400 bad_request`.
- Source failures do not fail the whole scan unless every critical source is unavailable; they update `coverage.sourceAvailability`.

## Response Contract

### Top-Level Shape

```json
{
  "assessment": {},
  "evidenceBundle": {},
  "explanation": {},
  "coverage": {
    "dataStatus": "PARTIAL_OR_UNKNOWN",
    "dataCompleteness": {},
    "sourceAvailability": {},
    "pageCoverage": {}
  },
  "inventory": {},
  "history": {},
  "trend": null,
  "alerts": [],
  "trace": {}
}
```

Backwards compatibility:

- Existing P0 consumers can keep using `assessment`, `evidenceBundle`, `explanation`, `coverage`, and `trace`.
- New P1 frontend should use `inventory`, `history`, `trend`, and `alerts` when present.

### Inventory Shape

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "chainId": 5000,
  "inventoryStatus": "partial",
  "totalValueUsd": 1234.56,
  "tokenCount": 4,
  "pricedTokenCount": 3,
  "unpricedTokenCount": 1,
  "source": "etherscan_v2_candidates_rpc_balanceOf",
  "tokens": [
    {
      "symbol": "USDT",
      "name": "Tether USD",
      "tokenAddress": "0x...",
      "decimals": 6,
      "balanceRaw": "1000000",
      "balance": 1.0,
      "priceUsd": 1.0,
      "valueUsd": 1.0,
      "firstSeenBlock": 123,
      "lastSeenBlock": 456,
      "candidateSource": "etherscan_v2_tokentx",
      "balanceSource": "mantle_rpc_balanceOf",
      "securityStatus": "known",
      "isSpam": false,
      "evidenceIds": ["ev_live_balance_abc", "ev_live_security_def"]
    }
  ]
}
```

Inventory acceptance:

- Native MNT must be represented as `tokenAddress: "native"`.
- ERC20 tokens must be deduped by lowercase `tokenAddress`.
- Zero balances are excluded unless `includeZeroBalances = true`.
- Every nonzero balance must have at least one balance evidence id.
- Token security may be `known`, `risky`, or `unknown`; unknown must not be treated as safe.

### History Shape

```json
{
  "wallet": "0x1234567890abcdef1234567890abcdef12345678",
  "chainId": 5000,
  "approvalHistory": {
    "status": "available",
    "items": [],
    "pageInfo": {
      "pageSize": 100,
      "fetchedPages": 3,
      "hasMore": true,
      "fromBlock": 0,
      "toBlock": "latest"
    }
  },
  "transferHistory": {
    "status": "available",
    "items": [],
    "pageInfo": {
      "pageSize": 100,
      "fetchedPages": 3,
      "hasMore": true
    }
  }
}
```

Approval item:

```json
{
  "approvalId": "approval_...",
  "tokenAddress": "0x...",
  "token": "USDT",
  "owner": "0x...",
  "spender": "0x...",
  "spenderLabel": null,
  "eventAllowanceRaw": "115792089...",
  "currentAllowanceRaw": "115792089...",
  "isUnlimited": true,
  "isActive": true,
  "blockNumber": 123,
  "txHash": "0x...",
  "observedAt": "2026-06-08T00:00:00Z",
  "source": "etherscan_v2_logs_rpc_allowance",
  "evidenceId": "ev_live_approval_..."
}
```

Transfer item:

```json
{
  "transferId": "transfer_...",
  "tokenAddress": "0x...",
  "token": "USDT",
  "direction": "in",
  "amountRaw": "1",
  "amount": "0.000001",
  "counterparty": "0x...",
  "pattern": "lookalike_address_dust",
  "riskLevel": "High",
  "blockNumber": 123,
  "txHash": "0x...",
  "observedAt": "2026-06-08T00:00:00Z",
  "source": "etherscan_v2_tokentx",
  "evidenceId": "ev_live_transfer_..."
}
```

History acceptance:

- Pagination must dedupe by `(txHash, tokenAddress, logIndex)` when available.
- Results must be sorted newest first.
- Every active approval risk must use current RPC allowance, not event allowance alone.
- Transfer risk can use fetched page window, but limitations must state that history may be partial.

### Trend Shape

```json
{
  "walletHash": "0x...",
  "status": "available",
  "points": [
    {
      "assessmentId": "assessment_live_...",
      "timestamp": "2026-06-08T00:00:00Z",
      "walletRiskScore": 42.5,
      "riskLevel": "Moderate",
      "dataConfidence": 0.72,
      "assessmentHash": "0x..."
    }
  ],
  "delta": {
    "scoreDelta": 12.5,
    "riskLevelChanged": true,
    "newTopRiskIds": ["risk_approval_active_unknown"]
  }
}
```

Trend acceptance:

- A first scan returns `status: "insufficient_history"`.
- Two or more scans for the same `walletHash` return chronological points and newest-vs-previous delta.
- Trend entries must store `assessmentHash` and `evidenceBundleHash`.

### Alert Shape

```json
{
  "alertId": "alert_...",
  "walletHash": "0x...",
  "assessmentId": "assessment_live_...",
  "alertType": "new_active_approval",
  "severity": "High",
  "status": "open",
  "title": "New active approval detected",
  "message": "USDT has an active approval to an unknown spender.",
  "evidenceIds": ["ev_live_approval_..."],
  "sourceAssessmentHash": "0x...",
  "createdAt": "2026-06-08T00:00:00Z",
  "resolvedAt": null
}
```

Alert types:

- `new_active_approval`
- `risk_score_increased`
- `risk_level_increased`
- `suspicious_transfer_detected`
- `token_security_risky`
- `source_unavailable`

Alert acceptance:

- Alerts must bind to evidence ids or source assessment hash.
- Duplicate open alerts for the same wallet/risk/evidence should be suppressed.
- Alert resolution changes local state only; no chain transaction is created.

## Data Completeness Rules

| Field | `available` | `partial` | `unavailable` |
|---|---|---|---|
| `nativeBalance` | RPC returned balance | not used | RPC failed or missing |
| `knownTokenBalances` | current balances confirmed for token candidates | known-token allowlist or limited candidate set | no token source |
| `fullTokenInventory` | provider proves complete inventory | transfer-derived candidates only | no inventory |
| `approvalEvents` | at least one approval page fetched or confirmed empty | fewer pages than requested or source warning | no approval source |
| `activeAllowanceConfirmation` | RPC allowance checked for all approval candidates | some confirmations failed | no RPC confirmation |
| `transferLogs` | requested transfer pages fetched | fewer pages than requested or rate-limited | no transfer source |
| `tokenSecurity` | GoPlus checked all inventory tokens | partial token checks or no inventory | GoPlus unavailable |
| `transactionHistory` | complete requested window | fetched page window only | no history source |

Final `assessment.dataStatus` remains `PARTIAL_OR_UNKNOWN` if any risk-critical field is `partial`, `unavailable`, or `not_supported_p0`.

## Backend Implementation Targets

Day 2 should create these backend contracts:

- `TokenInventoryNormalizer`
- `HistoryPageOptions`
- `PaginatedHistoryResult`
- `ApprovalHistoryItem`
- `TransferHistoryItem`

Day 3 should make `EtherscanV2Client` support:

- `token_transfers(wallet_address, page, offset, sort)`
- `approval_logs(owner_address, page, offset, from_block, to_block)`
- stable pagination metadata

Day 4 should make `LiveWalletAdapter` produce:

- `inventory`
- `history`
- updated `coverage.pageCoverage`
- unchanged P0-compatible `toolOutputs`

## Frontend Implementation Targets

The future React/Vite frontend should consume:

- scan summary from `assessment`
- balance table from `inventory.tokens`
- approvals table from `history.approvalHistory.items`
- transfers table from `history.transferHistory.items`
- trend chart from `trend.points`
- alert list from `alerts`
- evidence drawer from `evidenceBundle.evidence`

The current single-file workspace may stay as fallback until P1.6.

## Day 1 Acceptance Criteria

| Check | Status |
|---|---|
| Data source priority is defined | Pass |
| Scan request options are defined | Pass |
| Inventory response shape is defined | Pass |
| Approval / transfer history shapes are defined | Pass |
| Trend and alert shapes are defined | Pass |
| Data completeness rules are defined | Pass |
| Safety non-goals are explicit | Pass |
| Day 2 backend targets are clear | Pass |

## Startup Questions for Day 2

1. Should inventory derive token candidates from Etherscan V2 `tokentx` first, or should we add a Mantlescan-specific balance endpoint if available?
2. What is the default max history depth for demo: 3 pages, 5 pages, or 10 pages?
3. Should trend storage stay in memory for P1 demo, or use a local JSON/SQLite store before the formal database migration?
