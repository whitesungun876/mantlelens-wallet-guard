# P1 Acceptance Scope

## Purpose

This document separates the current accepted P1 foundation from the remaining
full P1 enhancements. It is the Phase 0 audit baseline for MantleLens Wallet
Guard and prevents demo/replay capability from being presented as complete live
capability.

## Scope Labels

| Label | Meaning | Acceptance Rule |
| --- | --- | --- |
| P1-foundation | The feature has a working local/demo path, explicit source availability, fallback behavior, and tests. | May be demoed as foundation or live-ready only when the response includes data mode and data completeness. |
| P1-full | The feature has verified live provider coverage, stable API output, UI support, fallback, and tests against live or provider-shaped data. | May be claimed as complete only after live smoke and tests pass. |
| Roadmap | The PRD names the feature, but this repo has no complete implementation yet. | Must not be presented as implemented. |

## Current Acceptance Position

| Area | Current Status | What Can Be Claimed | What Must Not Be Claimed |
| --- | --- | --- | --- |
| Moralis balances/history | P1-foundation | Adapter hook exists; Moralis remains optional and disabled by default for Mantle Data API coverage. | Full Mantle wallet inventory, full approvals, or full wallet history. |
| Etherscan V2/Mantlescan history | P1-foundation | Paginated approval and token-transfer history path exists when a key is configured. | Complete account history, labels, or contract source coverage. |
| Mantle RPC | P1-foundation | Read-only native balance, ERC20 balance, and allowance confirmation. | Token discovery or complete wallet history from RPC alone. |
| GoPlus | P1-foundation | Token security signal with advisory wording. | Guaranteed safety or full malicious address / approval phishing coverage. |
| Risk trend history | P1-foundation | In-memory assessment trend history. | Durable production history. |
| Alerts | P1-foundation | Local review alerts and local resolution. | Real-time external alert bot or automatic revoke/trade. |
| Transaction simulation | P1-foundation | Deterministic risk-score diff with `transactionCreated=false`. | Real pre-sign transaction simulation from Tenderly/Blockaid/Rabby-style engines. |
| On-chain assessment record | P1-foundation | Local benchmark record plus optional `AssessmentLogger` transaction when contract/key/signing dependencies are configured. | Fabricated Mantle tx hash or automatic revoke/trade execution. |
| Real revoke flow | Roadmap | Not implemented. | User-signed revoke execution. |
| DeFi position deep parsing | Roadmap | P0 LP/protocol token stub only. | Full DeFi position parsing. |
| NFT approval detection | Roadmap | Not implemented. | ERC-721/ERC-1155 approval coverage. |
| Social share card | Roadmap | Not implemented. | Generated share card. |
| ERC-8004 reputation feedback | Roadmap | Registration/card/MCP discovery only. | Reputation or validation feedback writes. |

## Phase 1 API Contract

The following PRD endpoints must not return 404. They may return partial,
unavailable, or replay data, but they must make that status explicit:

| Endpoint | Expected Phase 1 Behavior |
| --- | --- |
| `GET /api/wallet/balances` | Return native/current token balance rows from the scan workflow plus inventory and coverage. |
| `GET /api/wallet/approvals` | Return approval rows from the scan workflow with active allowance and evidence metadata. |
| `GET /api/wallet/transfers` | Return transfer rows from the scan workflow with tx evidence where available. |
| `GET /api/wallet/exposure` | Return portfolio concentration, RWA/yield exposure, and related sub-scores. |
| `GET /api/wallet/data-availability` | Return `dataCompleteness`, `sourceAvailability`, and page coverage. |
| `POST /api/risk/evaluate-wallet` | Return the same evidence-bound `WalletRiskAssessment` package as the scan workflow. |
| `POST /api/assessment/outcome` | Record a local outcome hash against the in-memory benchmark record. |

## Safety Rules

- Missing indexed data is unknown, not safe.
- Demo/replay output must keep `dataMode` visible.
- CoinGecko, DeFiLlama, or provider prices must not become APY, holder, or
  security-label claims.
- GoPlus clean output is a signal, not a guarantee.
- No API in P1-foundation executes revoke, swap, trade, transfer, or user-asset
  transaction broadcast.
- Missing assessment logger configuration must return `pending_unavailable`, not
  a fabricated transaction hash.
