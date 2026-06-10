# Day 3 Raw Adapter Outputs

## Goal

Day 3 delivers deterministic raw scan adapters over the Day 2 fixtures. These adapters model the P0 tool registry before the real Mantle RPC, GoPlus, CoinGecko, DeFiLlama, and RWA module integrations are wired into FastAPI.

## Code

| File | Purpose |
|---|---|
| `backend/mantlelens/fixtures.py` | Loads demo wallet fixtures |
| `backend/mantlelens/adapters.py` | Provides raw P0 tool adapter methods |
| `backend/mantlelens/cli.py` | Prints raw scan or evaluated assessment from a fixture |
| `frontend/mock-hooks.js` | Frontend mock hook contract for fixture-backed scans |

## Implemented Tools

| Tool | Fixture Output | P0 Rule Captured |
|---|---|---|
| `getNativeBalance` | Native MNT balance | Mantle RPC native balance |
| `getKnownTokenBalances` | Known-token balances | P0 cannot discover all unknown tokens |
| `getTokenApprovals` | Approval risk items | Approval events are not enough by themselves |
| `confirmActiveAllowance` | Active allowance confirmation | Zero allowance is not current risk |
| `getSpenderLabels` | Spender label map | Unknown label means unknown, not safe |
| `getTransactionCount` | Demo transaction count | Low-activity heuristic placeholder |
| `getTransferLogs` | Recent transfer items | Bounded known-token logs only |
| `getTokenPrices` | Token prices | Price-only source, not APY/security |
| `getTokenSecurity` | Known/unknown token security signal | GoPlus clean result is not guaranteed safe |
| `getRwaYieldExposure` | USDY/mUSD/mETH/cmETH exposure | mETH/cmETH are Mantle yield assets |

## Raw Scan Shape

```json
{
  "fixtureId": "high_risk_wallet",
  "wallet": {
    "address": "0x1000000000000000000000000000000000000003",
    "walletHash": "0xwallet_hash_high_001"
  },
  "chainId": 5000,
  "dataMode": "demo",
  "dataCompleteness": {},
  "sourceAvailability": {},
  "toolOutputs": {
    "getNativeBalance": {},
    "getKnownTokenBalances": {},
    "getTokenApprovals": {},
    "getTransferLogs": {},
    "getTokenPrices": {},
    "getTokenSecurity": {},
    "getRwaYieldExposure": {}
  },
  "evidence": []
}
```

## CLI

```bash
python3 -m backend.mantlelens.cli high_risk_wallet --raw
python3 -m backend.mantlelens.cli high_risk_wallet
```

## Day 3 Acceptance

- All 3 demo fixtures output balances, approvals, and transfers.
- Missing Moralis/indexed data is represented as `partial`, `known-token-only`, or `unavailable`, never as safe.
- Zero allowance approvals are excluded from active approval risk.
- Frontend has a mock hook contract that mirrors the scan response until FastAPI is introduced.
