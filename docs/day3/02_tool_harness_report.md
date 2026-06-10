# Day 3 Tool Harness Report

## Harness File

`tests/test_day3_day4_harness.py`

## Day 3 Cases Covered

| Test | Source Matrix ID | What It Proves | Status |
|---|---|---|---|
| `test_all_fixtures_produce_raw_scan_outputs` | Day 3 acceptance | Low, moderate, and high fixtures output balances, approvals, transfers | Pass |
| `test_tc003_indexed_api_unavailable_is_partial_not_safe` | TC-003 | Missing Moralis/indexed APIs produce partial or known-token-only state, not safe | Pass |
| `test_tc004_zero_allowance_is_not_active_risk` | TC-004 | Revoked/zero allowance approval is excluded from active risk | Pass |
| `test_tc005_unlimited_unknown_approval_scores_high` | TC-005 | Unlimited unknown approval produces ApprovalRisk >= 80 with evidence | Pass |

## Command

```bash
python3 -m unittest discover -s tests -v
```

## Latest Result

```text
Ran 9 tests
OK
```

## Notes For Day 5

- The adapter returns deterministic dictionaries instead of network responses.
- FastAPI can wrap these outputs directly for demo mode.
- Live adapter integration should keep the same `ToolResult` fields: `toolName`, `sourceStatus`, `dataCoverage`, `output`, `limitation`.
