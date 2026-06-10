# Day 10 Deployment Notes

## Requirements

- Python 3.11+
- No third-party Python dependencies are required for the local demo.
- Optional on-chain assessment commits require `requirements.onchain.txt`.

## Local Run

```bash
./scripts/run_demo.sh
```

Default URL:

```text
http://127.0.0.1:8765
```

## Stop

```bash
./scripts/stop_demo.sh
```

## Manual Run

```bash
python3 -m backend.mantlelens.server --host 127.0.0.1 --port 8765
```

## Health Check

```bash
curl --noproxy '*' -s http://127.0.0.1:8765/api/health
```

Expected:

```json
{
  "day": "10",
  "mode": "demo",
  "service": "mantlelens-wallet-guard",
  "status": "ok"
}
```

## Demo Data

Fixtures:

- `fixtures/demo_wallets/low_risk_wallet.json`
- `fixtures/demo_wallets/moderate_partial_wallet.json`
- `fixtures/demo_wallets/high_risk_wallet.json`

## Endpoints

| Endpoint | Purpose |
|---|---|
| `/` | API-connected demo workspace |
| `/api/health` | Server health |
| `/api/wallet/scan` | Scan fixture wallet |
| `/api/agent/explain` | Guarded explanation or fallback |
| `/api/simulation/approval` | Simulation-only approval diff |
| `/api/simulation/portfolio` | Simulation-only portfolio diff |
| `/api/assessment/commit` | Local assessment hash record plus optional real `AssessmentLogger` transaction |
| `/api/benchmark` | Benchmark history |
| `/api/events` | Recent core events |
| `/agent-registration.json` | ERC-8004-ready registration |
| `/.well-known/agent-card.json` | A2A agent card |
| `/mcp` | Read-only MCP list/call endpoint |

## Safety Flags

- `realExecutionAllowed = false`
- MCP is read-only.
- Missing assessment contract/key returns `pending_unavailable`; no fake transaction hash is created.
- Simulation does not create transactions.
- Missing indexed data stays `PARTIAL_OR_UNKNOWN`.

## Optional AssessmentLogger Deployment

This repo has a standalone deployment script instead of a Hardhat/Foundry workspace:

```bash
python3 -m pip install -r requirements.onchain.txt
python3 scripts/deploy_assessment_logger.py
```

The script reads `.env` and supports these aliases:

| Capability | Variables |
|---|---|
| RPC URL | `DEPLOY_RPC_URL`, `MANTLE_RPC_URL`, or `TENDERLY_NODE_RPC_URL` |
| Signer key | `PRIVATE_KEY`, `WALLET_PRIVATE_KEY`, or `SIGNER_PRIVATE_KEY` |
| Chain ID | `MANTLE_CHAIN_ID` or `CHAIN_ID` |
| Logger address consumed by app | `ASSESSMENT_CONTRACT_ADDRESS` or `ASSESSMENT_LOGGER_ADDRESS` |

After deployment, set the printed logger address in `.env` and run:

```bash
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
```
