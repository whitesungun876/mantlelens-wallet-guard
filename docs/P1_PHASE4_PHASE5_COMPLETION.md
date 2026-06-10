# P1 Phase 4/5 Completion Notes

## Phase 4 live data stability

Live provider calls now share a bounded `JsonHttpClient` retry policy:

- `LIVE_REQUEST_TIMEOUT_SEC`, default `3`
- `LIVE_REQUEST_RETRIES`, default `1`
- `LIVE_SCAN_DEADLINE_SEC`, default `15`

The workflow checks the live scan deadline before each tool call. When the budget is exhausted, remaining tools return `sourceStatus = unavailable` with a limitation that missing data is unknown, not safe.

Moralis is now controlled by explicit switches:

- `MORALIS_BALANCES_ENABLED`
- `MORALIS_HISTORY_ENABLED`
- `MORALIS_DATA_API_ENABLED` remains a backward-compatible umbrella switch.

Etherscan V2/Mantlescan pagination remains page/offset based for token transfers and approval logs. `pageCoverage` reports fetched pages, page size, block range, row count, and `hasMore`.

## Phase 5 schema/evidence alignment

`WalletRiskAssessment` now includes `metricResults` beside the existing `subScores`. Each metric result includes:

- `metricId`
- `score`
- `weight`
- `weightedContribution`
- `severity`
- `evidenceIds`
- `calculationMode`

Evidence normalization now enforces:

- approval evidence includes `allowanceConfirmed`
- transfer evidence includes `txHash`
- GoPlus clean output is worded as an advisory signal, never guaranteed safety.

## Validation

Commands run:

```text
python3 -m unittest tests.test_phase4_phase5_acceptance -v
python3 -m unittest discover -s tests -v
npm run build
HTTP smoke against http://127.0.0.1:8765
```

Results:

- Phase 4/5 targeted tests: 7/7 pass
- Full backend suite: 55/55 pass
- Frontend build: pass
- HTTP smoke: pass
