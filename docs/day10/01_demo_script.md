# Day 10 Demo Script

## Setup

```bash
./scripts/run_demo.sh
```

Open:

```text
http://127.0.0.1:8765
```

## Six-Minute Demo Flow

### 1. Product Positioning

MantleLens Wallet Guard is not another portfolio dashboard. It is an evidence-grounded wallet risk agent for Mantle. It scans approvals, suspicious transfers, known-token concentration, DeFi stub exposure, and Mantle RWA/yield assets, then explains and records the assessment.

### 2. Scan Wallet

Use fixture:

```text
High risk wallet
```

Click:

```text
Scan wallet
```

Expected:

- Risk level: High
- Score: 59.75
- Data status: `PARTIAL_OR_UNKNOWN`
- 3 top risks
- 6 evidence items
- 16 trace rows

Talk track:

The partial status is deliberate. Missing indexed history and unknown-token discovery are not marked as safe.

### 3. Evidence

Click a top risk row.

Expected:

- Evidence panel highlights related evidence ids.

Talk track:

Every top risk points back to evidence. The agent explains, but the white-box kernel scores.

### 4. LLM Guard

Click:

```text
Guard LLM
```

Expected:

- `fallbackReason = LLM claim guard failed`
- unsupported claim and forbidden phrase are listed.

Talk track:

If an LLM says the wallet is guaranteed safe or invents a claim without evidence, the guard rejects it and falls back to rule-based explanation.

### 5. Simulation

Click:

```text
Sim approval
```

Expected:

- `executionMode = simulation_only`
- `transactionCreated = false`
- Score delta is negative.

Talk track:

P0 never executes revoke or swap. It only shows the risk impact of a hypothetical safer action.

### 6. Commit Hash And Benchmark

Click:

```text
Commit hash
```

Expected:

- `status = pending_unavailable` when no assessment contract/key is configured.
- `realExecutionAllowed = false`
- Benchmark History gets one row.
- Events panel shows commit and benchmark events.

Talk track:

The MVP records the assessment hash in the local benchmark ledger. If no assessment contract or key is configured, the on-chain status stays `pending_unavailable` with no fabricated transaction hash.

### 7. Protocol

Open:

```text
http://127.0.0.1:8765/.well-known/agent-card.json
http://127.0.0.1:8765/agent-registration.json
```

Optional MCP call:

```bash
curl --noproxy '*' -s -X POST http://127.0.0.1:8765/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Talk track:

The agent is discoverable through registration, agent card, and a read-only MCP tools list.

## Stop

```bash
./scripts/stop_demo.sh
```
