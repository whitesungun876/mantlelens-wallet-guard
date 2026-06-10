# P2.5 Final Demo QA

## Scope

P2.5 polishes the existing MantleLens Wallet Guard flow for a safe demo. It does not add real revoke, swap, trade, automatic signing, custodial action, automatic on-chain commit, or P3 features.

## Snapshot

Safety snapshot created before P2.5 edits:

`snapshots/p2_4_history_trend_alerts_ready_20260609_125528.tar.gz`

The snapshot excludes `.env`, `node_modules`, `.venv`, build outputs, caches, prior snapshots, and SQLite runtime data.

## Product Flow

1. Select `Demo replay` or `Live Mantle`.
2. Run a scan.
3. Review the data completeness banner, score, risk level, confidence, and status.
4. Open top risks and confirm each risk has evidence IDs.
5. Inspect Evidence, Inventory, Approvals, and Transfers for the referenced records.
6. Review History, Trend, and Alerts.
7. Resolve informational alerts when reviewed.
8. Use On-chain Record only through the explicit `Record assessment on-chain` button.
9. Verify an existing tx through `Verify on-chain record`, which is read-only.

## Demo Scripts

### Demo Replay High-Risk Wallet

1. Select `Demo replay`.
2. Select `High risk wallet`.
3. Click `Scan`.
4. Show the data completeness banner and compliance disclaimer.
5. Show score, risk level, confidence, status, score breakdown, and top risks.
6. Click a top risk and open the Evidence tab.
7. Show the matching Inventory, Approvals, and Transfers panel rows.
8. Open Alerts, show generated informational alerts, and resolve one alert.
9. Open Trend and show history/trend state.

### Live Mantle Sepolia Wallet

1. Select `Live Mantle`.
2. Enter a Mantle Sepolia wallet address.
3. Click `Scan`.
4. Show source coverage and explain that partial/unavailable indexed data is unknown, not safe.
5. Show the live history record and cautious trend state.
6. Confirm no automatic commit, revoke, swap, trade, or signing happened.

### Manual On-Chain Record

1. Run a live scan.
2. Open On-chain Record.
3. Confirm recorder status, chain, contract address, and disabled/enabled button state.
4. Click `Record assessment on-chain` only when intentionally testing.
5. Confirm the warning about testnet MNT gas and no revoke/swap/trade/user wallet signing.
6. After success, show tx hash and explorer link.
7. Click `Verify on-chain record` to read back the existing tx without sending a new transaction.

## Feature Checklist

- Scan input and mode selector are visible.
- Current chain/network is visible in the scan controls.
- Data completeness banner is visible.
- Assessment summary shows score, risk level, confidence, status, and source coverage summary.
- Top risks show category, severity, confidence, score impact, evidence IDs, unknowns, and safe actions.
- Evidence panel exposes risk evidence records.
- Inventory, Approvals, and Transfers show source-aware empty states.
- History, Trend, and Alerts are visible with cautious comparability wording.
- Alerts are informational and resolvable.
- On-chain Record shows recorder status, chain, contract, tx hash after manual commit, verification status, and explorer link.
- Manual revoke enhancement is review-only in the UI and does not call a browser wallet.

## Safety Guarantees

- No scan or page load sends on-chain transactions.
- Tests use unavailable/mock recorder configuration by default.
- Real commit is manual-only through `/api/assessment/commit`.
- Verification uses read-only RPC calls.
- Missing indexed data is marked partial, unavailable, unknown, or source_failed; it is never treated as safe.
- Safe actions are simulation, review, inspect, rescan, or source-coverage checks.
- `.env` and private keys are not documented, copied, or exposed.

## Non-Goals

- No real revoke execution.
- No real swap/trade.
- No automatic wallet signing.
- No custodial action.
- No broad frontend redesign.
- No P3 features.

## Verification Commands

```bash
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
python3 -m unittest tests.test_p2_risk_engine_hardening -v
python3 -m unittest tests.test_p2_assessment_readback -v
python3 -m unittest tests.test_p2_history_trend_alerts -v
python3 -m unittest tests.test_p2_final_demo_qa -v
./scripts/qa_all.sh

cd frontend/app
npm run build
npm run typecheck
```

Additional final demo smoke:

```bash
./scripts/qa_p2_final_demo_smoke.sh
```

## Browser Smoke

Run backend and frontend:

```bash
./scripts/run_demo.sh
./scripts/run_app.sh
```

Open `http://127.0.0.1:5173` and verify:

- Demo high-risk scan works.
- Top risks resolve to evidence and detail panels.
- History, Trend, and Alerts are visible.
- Alert resolve works.
- On-chain Record does not auto-commit.
- Verify button is disabled until a tx exists.
- Live Mantle Sepolia scan marks partial/unavailable data as unknown, not safe.
- No automatic revoke, swap, trade, signing, or commit occurs.

P2.5 browser result:

- Demo replay high-risk scan passed in the in-app browser.
- Overview showed data completeness, disclaimer, score/risk/confidence/status, source coverage, top risks, score breakdown, and On-chain Record.
- Evidence tab showed resolvable evidence with no `unresolved_evidence`.
- Trend tab showed wallet history, trend delta, source coverage, and trend points.
- Alerts tab showed open alerts; resolving one alert updated the UI locally.
- Manual revoke enhancement displayed `Manual Revoke Review` / `Review request`; legacy `Send to wallet` text was absent.
- Visual check found no horizontal overflow and no clipped button labels at 1280x720.
- Live scan safety was verified by HTTP final smoke because the in-app browser automation text-entry channel blocked wallet-address input. The product live endpoint returned `PARTIAL_OR_UNKNOWN` and did not auto-commit.

Final command result:

```text
./scripts/qa_all.sh
mantlelens qa all ok

./scripts/qa_p2_final_demo_smoke.sh
{"alerts": 4, "demoRisks": 3, "historyRecords": 10, "liveStatus": "PARTIAL_OR_UNKNOWN", "trendStatus": "comparable", "verifyStatus": "unknown"}
```

## Known Caveats

- Live indexed coverage depends on configured providers and may be partial.
- Moralis Mantle Sepolia coverage can be partial or unavailable.
- Trend can be partially comparable when source coverage changes.
- Commit verification is linked to matching history records by assessment hash, assessment id, or tx hash; older local records without those values may remain unlinked.
- Manual on-chain commit spends testnet MNT only after explicit confirmation.
- The in-app browser automation layer may block programmatic text entry if its virtual clipboard is unavailable; HTTP live smoke remains the reliable automated live-scan check.
