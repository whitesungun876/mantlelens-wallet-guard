# Day 9 Full Harness Report

## Command

```bash
python3 -m unittest discover -s tests -v
```

## Result

```text
Ran 31 tests in 1.548s
OK
```

## Coverage By Day

| Area | Tests |
|---|---:|
| Day 3 raw tools | 4 |
| Day 4 risk and evidence | 5 |
| Day 5 workflow and fallback explanation | 3 |
| Day 6 policy and API | 4 |
| Day 7 LLM guard and simulation | 4 |
| Day 8 ledger, benchmark, events | 4 |
| Day 9 protocol | 5 |
| Day 10 demo freeze | 2 |

## Quality Gates

| Gate | Result |
|---|---|
| Tool outputs are structured | Pass |
| Missing indexed data is not safe | Pass |
| Active allowance confirmed | Pass |
| Risk claims are evidence-bound | Pass |
| Orphan claims are blocked | Pass |
| LLM unsupported claims fall back | Pass |
| Simulation creates no transaction | Pass |
| Commit is idempotent | Pass |
| Core events include trace ids | Pass |
| MCP is read-only | Pass |
| Standard demo runs 3 times | Pass |

## Residual Scope Notes

- Live Mantle RPC and GoPlus integrations are represented by deterministic fixtures.
- Chain commit stays `pending_unavailable` without assessment logger config and does not fabricate a tx id.
- MCP P0 is intentionally read-only.
- Frontend is a single-file local demo workspace, not a production Next.js app.
