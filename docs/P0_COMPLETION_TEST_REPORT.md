# P0 Completion Test Report

## Result

P0 is complete for the local demo package.

## Test Commands

```bash
python3 -m unittest discover -s tests -v
./scripts/run_demo.sh
```

## Harness Result

```text
Ran 31 tests in 1.542s
OK
```

## HTTP Smoke Result

```text
health ok 10
scan High PARTIAL_OR_UNKNOWN rule_fallback 3 6 16
simulation simulation_only False -21.0
commit mocked False
benchmark 1
agent_card 7 False
mcp 8 True
```

## Browser Verification

```text
title = MantleLens API Workspace
health = ok · demo · day 10
score = 59.75
riskLevel = High
dataStatus = PARTIAL_OR_UNKNOWN
riskRows = 3
evidenceRows = 6
benchmarkRows = 2
eventRows = 8
protocolLinks = /.well-known/agent-card.json, /agent-registration.json
guard fallbackReason = LLM claim guard failed
commit status = pending_unavailable
realExecutionAllowed = false
```

## P0 Acceptance Mapping

| Requirement | Status |
|---|---|
| Wallet input / fixture scan | Pass |
| Known-token balance scan | Pass |
| Approval risk with active allowance confirmation | Pass |
| Suspicious transfer detection | Pass |
| Portfolio / RWA-yield risk scoring | Pass |
| Data completeness shows partial / unknown | Pass |
| Every top risk binds to evidence ids | Pass |
| Rule fallback explanation works | Pass |
| LLM unsupported claims are blocked | Pass |
| Simulation-only actions create no transaction | Pass |
| Assessment hash commit is mocked and idempotent | Pass |
| Benchmark history updates | Pass |
| Core events include trace ids | Pass |
| Agent card / registration / MCP are available | Pass |
| MCP tools are read-only | Pass |

## Conclusion

P0 is complete as a local, fixture-backed, simulation-only Hackathon MVP. Remaining work is P1/P2 live data integration and real chain commit.
