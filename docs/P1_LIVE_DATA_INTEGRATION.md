# P1 Live Data Integration

## Status

P1 live-data foundation is implemented. P0 fixture scans remain the replay and regression baseline.

## What Changed

- Added `LiveWalletAdapter` behind the same raw `ToolResult` shape as the fixture adapter.
- Added environment-based source config in `MantleLensConfig`.
- Added `/api/wallet/scan` support for `dataMode: "live"` and `walletAddress`.
- Added live-data mocked tests so source logic can be validated before API keys are configured.
- Added a live wallet input to the current API workspace.
- Added explicit Moralis boundary handling: Moralis RPC Nodes can be used for Mantle RPC, while Moralis Data API is disabled by default for Mantle wallet/token inventory.

## Data Modes

| Mode | Purpose | Source |
|---|---|---|
| `demo` | Current local demo | Fixture wallet files |
| `replay` | Golden regression harness | Fixture wallet files |
| `live` | P1 real wallet scan | Mantle RPC, GoPlus, Moralis, Etherscan V2 |

## Environment Variables

Use `.env.example` as the template.

| Variable | Required for | Notes |
|---|---|---|
| `MANTLE_RPC_URL` | Native MNT balance, ERC20 `balanceOf`, active allowance confirmation | Defaults to `https://rpc.mantle.xyz` |
| `MORALIS_NODE_URL` | Moralis-backed Mantle JSON-RPC | Use the full dashboard URL, for example `https://site1.moralis-nodes.com/mantle/<api-key>` |
| `GOPLUS_API_KEY` | Token security evidence | Optional until rate limits require auth |
| `MORALIS_API_KEY` | Moralis Data API on supported chains | Mantle Data API wallet/token inventory is disabled by default; set `MORALIS_DATA_API_ENABLED=true` only for a supported chain |
| `MORALIS_DATA_API_ENABLED` | Moralis Data API switch | Defaults to `false` |
| `ETHERSCAN_V2_API_KEY` | Indexed approvals and transfer history | `MANTLESCAN_API_KEY` can be used as fallback |
| `MANTLE_KNOWN_TOKENS_JSON` | RPC allowlist fallback balances | Used only when Moralis is absent |

## Live Scan Request

```json
{
  "dataMode": "live",
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "includeExplanation": true
}
```

POST this to `/api/wallet/scan`.

## Safety Boundary

Live mode is still read-only. Revoke/trade/broadcast tools remain blocked by `PolicyEngine`, and simulations keep `executionMode: "simulation_only"` with `transactionCreated: false`.

## Acceptance Checks

```bash
python3 -m unittest discover -s tests -v
./scripts/run_demo.sh
```

Current expected unit result:

```text
Ran 33 tests
OK
```

## Next Implementation Step

After API keys are configured, run a live wallet scan and inspect:

- `coverage.sourceAvailability`
- `coverage.dataCompleteness`
- `assessment.dataMode == "live"`
- every `assessment.topRisks[].evidenceIds`
- `evidenceBundle.evidence[].source`

If a source is unsupported, missing, or rate-limited, the scan should stay partial and must not mark missing data as safe.

## Moralis Mantle Notes

Moralis currently documents Mantle support for RPC Nodes, including Mantle Mainnet chain ID `0x1388` / `5000` with path parameter `mantle`. Current Moralis Data API supported-chain tables do not expose Mantle wallet/token data, so Mantle wallet inventory should come from Mantlescan/Etherscan V2, another Mantle-supported indexer, or bounded RPC allowlists until a supported Data API source is selected.
