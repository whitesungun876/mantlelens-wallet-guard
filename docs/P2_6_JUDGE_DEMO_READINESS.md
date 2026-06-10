# P2.6 Judge Demo Readiness

## Purpose

This pass finishes the judge-facing demo layer for MantleLens Wallet Guard. It keeps the product safe and read-only by default while making the Mantle Turing Test story explicit: an autonomous agent gathers on-chain data, evaluates wallet risk, binds evidence, prepares simulation-only responses, and optionally records an assessment hash on Mantle Sepolia after explicit user confirmation.

## Demo Narrative

Within the first 10 seconds, the page should communicate:

- This is an autonomous Mantle wallet risk intelligence agent.
- The agent runs a benchmark-style task, not a generic debug dashboard.
- The output is evidence-bound and source-aware.
- Simulation is review-only and does not broadcast a transaction.
- On-chain proof is optional, manual, and only available from a live Mantle Sepolia scan.

## Judge Path

1. Open `http://127.0.0.1:5173`.
2. Keep `Demo data · Mantle risk profile` selected.
3. Click `Run benchmark case`.
4. Confirm the Overview shows:
   - `3 suspicious on-chain signals detected`
   - `60 / 100`
   - agent timeline states such as `DATA_GATHERING`, `RISK_EVALUATING`, and `EVIDENCE_BINDING`
   - proof status `Replay only`
5. Click `Simulate revoke impact`.
6. Confirm the simulation says why the agent selected the action and that no transaction was broadcast.
7. Open `Evidence`.
8. Confirm replay fixture references are explicitly marked as not real explorer transactions.
9. Open `History`.
10. Confirm the benchmark matrix shows multiple cases: multi-signal, approval, poisoning, yield, partial coverage, quiet wallet, and critical risk.
11. Open `Advanced` only for technical review.
12. Confirm ERC-8004 wording is honest: compatible registration and local feedback in demo, with no identity NFT claim unless contract/token details are shown.

## Live Proof Path

1. Select `Live scan`.
2. Enter a public Mantle Sepolia wallet address provided for the demo.
3. Confirm the proof panel is ready but no on-chain transaction has been sent.
4. If intentionally testing proof, click `Record assessment hash` and confirm the browser prompt.
5. After success, use `Verify proof` to read back the record.

This path never runs automatically. A real on-chain commit requires an explicit user action and confirmation.

## Target 11 Acceptance

- A judge-facing runbook exists and explains the demo path without exposing secrets.
- The runbook distinguishes replay evidence from live Mantle Sepolia proof.
- ERC-8004/reputation wording is explicit and does not overclaim an identity NFT.
- Simulation and proof boundaries are written in product-facing language.

## Target 12 Acceptance

- A browser-level smoke script opens the app and checks the judge path.
- The script verifies primary navigation, first-screen density, evidence labels, simulation safety copy, benchmark matrix, Advanced scoring copy, and ERC-8004 honesty.
- The script saves a screenshot to `artifacts/p2_6_judge_browser_smoke.png`.
- The script is included in `./scripts/qa_all.sh`.

## Verification Commands

```bash
./scripts/qa_p2_6_judge_browser_smoke.sh
python3 -m unittest tests.test_p2_6_demo_ux -v
cd frontend/app && npm run build
./scripts/qa_all.sh
```

## Safety Guarantees

- No scan or page load sends an on-chain transaction.
- No test sends an on-chain transaction.
- No real revoke, swap, transfer, trade, wallet signing, custodial action, private key input, or seed phrase input is introduced.
- Missing indexed data remains partial, unavailable, unknown, or source_failed; it is never treated as safe.
- `.env` is not copied into docs, frontend code, tests, screenshots, or logs.

## Known Caveats

- Replay benchmark records are reference data, not live Mantle transaction history.
- Live Mantle Sepolia indexed data can remain partial depending on provider coverage.
- On-chain assessment proof requires configured AssessmentLogger and explicit confirmation.
