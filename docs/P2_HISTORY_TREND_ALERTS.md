# P2 History, Trend, and Alerts

Date: 2026-06-09

Scope: P2.4 only. This pass turns individual wallet scans into a local wallet monitoring flow with persisted assessment history, cautious trend analysis, and informational alerts. It does not implement P2.5 frontend polish/refactor, real revoke, swaps, automatic signing, custodial actions, or automatic on-chain commits.

## Snapshot

`/Users/lola/Desktop/mantle` is not inside a Git repository, so a local tar snapshot was created before code changes.

Snapshot path:

```text
/Users/lola/Desktop/mantle/snapshots/p2_35_readback_ready_20260609_120506.tar.gz
```

Snapshot exclusions were verified:

- `.env`
- `.env.*`
- `node_modules`
- `.venv`
- `dist`
- `build`
- Python/cache directories
- previous `.tar.gz` snapshots

## Storage Design

Storage chosen: SQLite by default, with an in-memory implementation for tests.

Implementation:

- `backend/mantlelens/history_store.py`
  - `SQLiteAssessmentHistoryStore`
  - `InMemoryAssessmentHistoryStore`
  - `ASSESSMENT_HISTORY_STORE`

Default database:

```text
data/mantlelens.sqlite3
```

The store writes one assessment history record per scan. Records include:

- assessment id/hash
- wallet address/hash
- chain id/network
- mode: `demo`, `replay`, or `live`
- scan timestamp
- risk score/level
- confidence/status
- source statuses and coverage summary
- top risk summaries
- risk categories
- evidence ids
- commit tx hash and verification status when available
- AssessmentLogger contract address when available

The store does not store private keys, raw `.env`, raw RPC URLs, or API keys.

Projection and smoke paths that call scan with `record_memory=false` use an in-memory history store and do not pollute persistent monitoring history.

## API Contracts

### GET `/api/wallet/history`

Query:

```text
address=<wallet>&chain_id=<chain_id>&mode=<demo|replay|live|all>&limit=<n>
```

Compatibility query:

```text
walletHash=<wallet_hash>&limit=<n>
```

Behavior:

- Records are ordered by `scanTimestamp` descending.
- If `mode` is omitted and multiple modes exist, the endpoint returns only the latest mode and sets `modeSelection=latest_mode_without_mixing`.
- `mode=all` explicitly allows mixed demo/replay/live records.
- Response includes `records`, `trend`, `benchmarkRecords`, and `alerts` for UI compatibility.

### GET `/api/wallet/trend`

Query:

```text
address=<wallet>&chain_id=<chain_id>&mode=<demo|replay|live|all>&limit=<n>
```

Response includes:

- `trendStatus`
- score/risk/confidence/status series
- source coverage series
- latest score delta
- latest risk level change
- source coverage changes
- top risk category changes
- cautious trend summary
- comparability notes

### GET `/api/alerts`

Query:

```text
address=<wallet>&chain_id=<chain_id>&mode=<demo|replay|live>&status=<open|resolved|all>
```

Compatibility query:

```text
walletHash=<wallet_hash>&status=<open|resolved|all>
```

### POST `/api/alerts/{alert_id}/resolve`

Request:

```json
{
  "resolution_note": "reviewed"
}
```

Compatibility endpoint remains available:

```text
POST /api/alerts/resolve
```

Resolve updates local alert state only. It does not submit any chain transaction.

## Trend Comparability

Trend statuses:

| Status | Meaning |
| --- | --- |
| `insufficient_history` | Fewer than two records. |
| `comparable` | Two or more records with stable source coverage. |
| `partially_comparable` | Source coverage changed materially. |
| `not_comparable` | Records span incompatible mode/chain context. |

Rules:

- Missing indexed data is unknown, not safe.
- Source failure reduces comparability; it does not prove lower risk.
- If score decreases while source coverage degrades, the summary says improvement is not confirmed.
- The UI never says “wallet became safer.”

Example cautious summary:

```text
Risk score decreased, but source coverage also degraded, so improvement is not confirmed.
```

## Alert Rules

Implemented rules:

1. New active/high-risk approval detected.
2. Risk score increased.
3. Risk level worsened.
4. Source coverage degraded.
5. Suspicious transfer / address-poisoning pattern detected.
6. Source unavailable / source failed / P0 unsupported coverage.
7. Risky token security signal.

Alert fields include both legacy camelCase and P2.4 snake_case aliases:

- `alertId` / `alert_id`
- `walletAddress` / `wallet_address`
- `chainId` / `chain_id`
- `alertType` / `type`
- `evidenceIds` / `evidence_ids`
- `dedupeKey` / `dedup_key`
- `recommendedSafeActions` / `recommended_safe_actions`

Deduplication:

- Open alerts use deterministic `dedupeKey`.
- Repeated scans update `lastSeenAt` and `occurrenceCount` instead of creating unlimited duplicates.
- Resolved alerts remain queryable.
- If the same issue reappears materially later after resolution, a new alert may be created by future policy changes.

Alerts are informational only. Recommended actions are review/simulation/source-check actions, not execution.

## Frontend Behavior

Minimal updates only:

- Existing Trend tab now shows:
  - Wallet History
  - Trend Delta
  - Source Coverage
  - Trend Points
- Existing Alerts tab now shows:
  - open/resolved counts
  - alert details
  - evidence ids
  - recommended safe actions
  - local resolve button

Empty states:

```text
No previous assessments for this wallet. Run another scan to build trend.
Need at least two comparable assessments to show trend.
Trend is partially comparable because source coverage changed.
No open alerts. This does not mean the wallet is risk-free.
```

Frontend safety:

- Scan writes local assessment history only.
- Scan does not auto-commit on-chain.
- Alert resolution does not trigger chain transactions.
- Trend/alert panels do not infer safety from missing data.

## Safety Constraints

- No private key printing or exposure.
- No `.env` copied into docs, snapshots, tests, logs, or frontend.
- No automatic on-chain commit.
- No real revoke.
- No real swap.
- No automatic wallet signing.
- Tests use unavailable/mock recorder defaults.
- Missing indexed data remains unknown/partial/source_failed, not safe.

## Verification Commands

Commands run:

```bash
python3 -m unittest tests.test_p2_history_trend_alerts -v
python3 -m unittest tests.test_p2_risk_engine_hardening -v
python3 -m unittest tests.test_p2_assessment_readback -v
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
./scripts/qa_all.sh
```

Observed results:

- P2.4 focused tests: PASS, 13 tests.
- P2.3 risk tests: PASS, 11 tests.
- P2.35 readback tests: PASS, 8 tests.
- Provider config smoke with `REQUIRE_FULL_P1=true`: PASS.
- Full QA: PASS.
- Full QA covered lint, typecheck, unit tests, integration tests, frontend build, replay smoke, P2 local-only smoke, provider smoke, live smoke, and browser smoke prerequisites.

Full QA live smoke confirmed:

```text
onchainWriteAttempted: false
dataStatus: PARTIAL_OR_UNKNOWN
```

## Browser Smoke

Backend and frontend:

- Backend: `http://127.0.0.1:8765`
- Frontend: `http://127.0.0.1:5173`

Demo replay high-risk wallet:

- Scan completed.
- Top risks visible.
- Wallet History visible.
- Trend Delta / Trend Points visible.
- Alerts visible.
- Approval alert showed matching evidence id.
- Alert resolve worked locally.
- No tx hash appeared.
- No automatic on-chain commit occurred.

Live Mantle Sepolia wallet:

- Scan completed for a user-provided public Mantle Sepolia wallet address.
- `PARTIAL_OR_UNKNOWN` visible.
- Source coverage / wallet activity uncertainty risks visible.
- Wallet History visible with live Mantle Sepolia record.
- Trend used cautious/partial-comparability wording.
- Alerts tab visible with unknown-not-safe semantics.
- No tx hash appeared.
- No automatic commit, revoke, swap, or signing occurred.

## Known Caveats

- SQLite is local-only and not a multi-user production database.
- Local alert deduplication is deterministic but intentionally simple.
- History records store summarized source/risk/evidence data, not full raw provider payloads.
- Trend comparability currently compares latest two records; deeper longitudinal analytics remain P2.5+.
- Commit tx hash / verification status is stored only when a commit/verification record is passed into the history flow.

## Remaining Before P2.5

- Frontend polish for denser history and alert drill-down.
- Optional chart visualization for score/confidence series.
- Better persisted linkage between manual commits and existing history records.
- Product copy review for demo/judge mode.
