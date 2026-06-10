# Day 9 Protocol Integration

## Goal

Day 9 adds ERC-8004-ready registration, A2A agent card, and read-only MCP tool exposure.

## Code And Files

| Artifact | Path |
|---|---|
| Protocol implementation | `backend/mantlelens/protocol.py` |
| Dynamic registration endpoint | `GET /agent-registration.json` |
| Dynamic well-known registration endpoint | `GET /.well-known/agent-registration.json` |
| Dynamic agent card endpoint | `GET /.well-known/agent-card.json` |
| MCP endpoint | `POST /mcp` |
| Static registration file | `protocol/agent-registration.json` |
| Static agent card | `protocol/agent-card.json` |
| Static MCP tool list | `protocol/mcp-tools-list.json` |

## MCP Tools

| Tool | Mode | Notes |
|---|---|---|
| `scan_wallet_risk` | read-only | Returns assessment, coverage, trace |
| `get_wallet_exposure` | read-only | Returns balances and source availability |
| `get_approval_risks` | read-only | Returns active approval rows |
| `get_suspicious_transfers` | read-only | Returns transfer candidates |
| `get_rwa_yield_risks` | read-only | Returns RWA/yield exposure payload |
| `get_evidence_bundle` | read-only | Returns evidence bundle |
| `get_benchmark_history` | read-only | Returns local benchmark records |
| `record_wallet_assessment` | read-only projection | Does not mutate state in MCP P0 |

## Safety

- MCP P0 is read-only.
- No MCP tool executes revoke, swap, trade, or transfer.
- `record_wallet_assessment` returns instructions for REST commit and `status = not_mutated`.
- All agent card and registration files declare `realExecutionAllowed = false`.

## Day 9 Acceptance

- Protocol files are valid JSON.
- Agent registration and card expose stable skills.
- MCP tools list has read-only hints.
- MCP `tools/call` can run `scan_wallet_risk`.
- MCP record projection does not mutate ledger state.
