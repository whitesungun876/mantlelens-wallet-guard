# P2.6 Demo UX Simplification

## Scope

P2.6 turns the technically complete P2 demo into a judge-facing AI Alpha & Data product flow for Mantle Turing Test Hackathon 2026. It does not change the backend risk engine, add real revoke/swap/signing, or add automatic on-chain commit behavior.

## What Was Simplified

- Replaced the debug-style workspace tabs with the primary product journey:
  - `Overview`
  - `Evidence`
  - `History`
- Renamed local persistence from `Record locally` to `Save assessment`.
- Demoted `On-chain Proof` from a top-level tab to contextual proof details from Overview, Evidence, and History.
- Moved `Advanced` out of the primary tab bar into a secondary technical control.
- Reframed the first-screen hero as on-chain signal intelligence:
  - `3 suspicious on-chain signals detected`
  - `Signal Risk Index`
  - rounded score, for example `60 / 100`
  - confidence
  - data coverage
  - on-chain record status
- Replaced repeated risk sections with three signal cards:
  - `Approval anomaly`
  - `Address poisoning signal`
  - `Yield concentration signal`
- Converted raw enums and IDs into product-facing labels:
  - `SIMULATE_REVOKE_APPROVAL` -> `Simulate revoke`
  - raw source errors -> `Source unavailable`
  - raw evidence IDs -> secondary `Evidence ID` lines
- raw score method -> hidden behind internal metric details
- fixture/page-size/max-page controls -> collapsed under `Advanced scan settings`
- Combined history, trend, and alerts into `History`.
- Grouped repeated demo history rows and grouped alerts by type.
- Added judge-facing benchmark cases for multi-signal, approval, poisoning, yield, partial coverage, quiet wallet, and critical risk flows.
- Added an explicit live Sepolia proof demo entry point while keeping assessment commit manual-only.
- Added browser-level judge demo smoke coverage in `scripts/qa_p2_6_judge_browser_smoke.sh`.

## Moved To Advanced

The following remain available but are no longer shown by default:

- P1 enhancement modules
- Agent identity / ERC-8004 / MCP
- Trace events
- raw score internals
- benchmark records
- LLM explanation block
- raw IDs and internal metric names

## Demo Story Path

1. Start from the compact scan bar.
2. Click `Scan`.
3. Read the Assessment Hero:
   - which on-chain signals were detected?
   - what is the Signal Risk Index?
   - how confident is the agent?
   - what data coverage limits apply?
4. Review the three signal cards.
5. Open `Evidence` to inspect approval, transfer, inventory, and evidence details.
6. Open `History` to review benchmark cases, assessment history, trend, and informational alerts.
7. Use contextual `View proof` / `Record assessment hash` links to inspect optional proof status.
8. Open `Advanced` only if a technical reviewer wants raw internals, trace, MCP, ERC-8004 compatibility, or scoring details.

## Before / After

Before:

- First screen looked like an engineering/debug dashboard.
- P1 modules, Agent/MCP, score internals, evidence IDs, and benchmark records competed with the core result.
- Local record and on-chain record language was ambiguous.
- Demo/live labels could read like active chain metadata instead of fixture context.

After:

- First screen answers: AI agent, Mantle wallet, three risky on-chain signals, evidence, simulation, and optional proof.
- Demo parameters are hidden under `Advanced scan settings`.
- Live mode is labeled as Mantle Sepolia.
- Missing indexed data is framed as unknown, not safe.
- On-chain proof is clearly optional and manual.
- Replay fixture references are clearly marked as replay evidence, not real explorer transactions.
- Simulation explains why the agent selected an action and confirms no transaction was broadcast.
- ERC-8004 copy is honest: compatible registration and local reputation feedback in demo; no identity NFT is claimed unless contract and token details are shown.

## Safety Guarantees

- No scan or page load sends on-chain transactions.
- No automatic on-chain commit.
- No real revoke, swap, trade, custodial action, or wallet signing.
- Safe actions remain simulation, review, inspect, rescan, and source-coverage checks.
- Alerts are informational only.
- Missing indexed data remains partial, unavailable, unknown, or source_failed; it is never treated as safe.
- `.env` and private keys are not copied into docs, frontend, tests, or logs.

## Verification Commands

```bash
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
python3 -m unittest tests.test_p2_risk_engine_hardening -v
python3 -m unittest tests.test_p2_assessment_readback -v
python3 -m unittest tests.test_p2_history_trend_alerts -v
python3 -m unittest tests.test_p2_final_demo_qa -v
python3 -m unittest tests.test_p2_6_demo_ux -v

cd frontend/app
npm run build
npm run typecheck

cd ../..
./scripts/qa_p2_final_demo_smoke.sh
./scripts/qa_p2_6_judge_browser_smoke.sh
./scripts/qa_all.sh
```

## Browser Smoke Summary

Frontend URL:

`http://127.0.0.1:5173`

Observed P2.6 AI Alpha & Data first view:

`artifacts/p2_6_judge_browser_smoke.png`

Browser smoke result:

- First view shows compact scan controls, not a heavy debug sidebar.
- Assessment Hero shows `3 suspicious on-chain signals detected`.
- Signal Risk Index shows rounded score `60 / 100`, not `59.75`.
- Signal cards show approval anomaly, address poisoning signal, and yield concentration signal.
- Summary does not show `Evidence ID`, `Internal metric`, raw action enums, or fixture profile text.
- Primary navigation is `Overview`, `Evidence`, and `History`.
- `On-chain Record` is no longer primary copy; optional proof lives behind contextual proof actions.
- Advanced debug sections are not visible by default.
- No visible `Send to wallet`.
- Tabs are no longer sticky, avoiding overlap during scroll.
- No horizontal overflow or clipped critical buttons in the Playwright browser smoke.
- Benchmark case chips remain compact enough for the first viewport.
- Replay fixture tx references are labeled as not real explorer transactions.
- Advanced scoring deduplicates DeFi / yield exposure and explains the formula.

## Known Caveats

- The frontend still uses a single React file for the main app; P2.6 intentionally avoided a broad frontend refactor.
- In-app browser automation in this environment exposes screenshot/navigation but not full DOM interaction, so API smoke and static UI tests cover automated assertions.
- Demo history may contain repeated records from prior QA runs; the Monitor view groups repeated demo results for readability.
- Live indexed data may remain partial depending on Moralis / Mantlescan / GoPlus coverage.
- Full presentation packaging remains a later step, not part of P2.6.
