# P2 Risk Engine Hardening

Date: 2026-06-09

Scope: P2.3 only. This pass hardens the MantleLens risk engine around evidence-first claims and deterministic scoring. It does not implement trend, alerts, real revoke execution, swaps, automatic signing, or a broad frontend refactor.

## Risk Categories

Implemented or hardened categories:

| Category | Evidence basis | Safe actions |
| --- | --- | --- |
| Unlimited approval risk | Active allowance evidence and balance evidence. | Simulate revoke impact, review spender, manual revoke only from user wallet if supported. |
| Unknown spender approval risk | Approval evidence plus missing spender label / advisory security signal. | Review spender, simulate revoke impact. |
| High-value token exposure risk | Inventory / balance evidence with price-only exposure sizing. | Inspect token, review portfolio exposure. |
| Dust transfer / address poisoning risk | Transfer evidence with tx hash and lookalike/dust pattern. | Mark counterparty suspicious, review transfer log. |
| Token concentration risk | Inventory evidence and known-token/provider inventory concentration. | Review concentration, simulate portfolio adjustment. |
| Suspicious or unverified token risk | GoPlus token security evidence; clean signals are advisory only. | Inspect token, check source coverage. |
| Source coverage / partial data risk | Synthetic source coverage evidence from `dataCompleteness` and source statuses. | Check source coverage, rescan later. |
| Stale data risk | Live evidence with stale or missing timestamps. | Rescan later, check source coverage. |
| Wallet activity risk | Transfer / transaction history unavailable or incomplete. | Check source coverage, rescan later. |

## Risk Output Contract

Each risk now keeps the legacy P0/P1 fields and adds the P2.3 evidence-first contract:

```json
{
  "riskId": "risk_approval_unknown_unlimited",
  "risk_id": "risk_approval_unknown_unlimited",
  "title": "Active unlimited approval",
  "severity": "High",
  "category": "approval",
  "scoreImpact": 80,
  "score_impact": 80,
  "confidence": 0.78,
  "evidenceIds": ["ev_high_unlimited_approval"],
  "evidence_ids": ["ev_high_unlimited_approval"],
  "sourceStatus": "partial",
  "source_status": "partial",
  "explanation": "USDT has an active unlimited approval to an unknown spender.",
  "recommended_safe_actions": ["simulate revoke impact", "review spender"],
  "is_blocking": false,
  "unknowns": ["spender label unavailable"]
}
```

The engine also returns:

- `assessment.riskEngine.schemaVersion = mantlelens.risk_engine.v2`
- `assessment.riskEngine.allRisks`
- `assessment.scoreBreakdown`
- `assessment.riskLevelV2`, where legacy `Moderate` maps to `Medium`

## Scoring Method

The final wallet score remains deterministic and compatible with P0/P1:

```text
weightedMetricSum =
  approvalRisk * 0.35
  + suspiciousTransferRisk * 0.25
  + assetConcentrationRisk * 0.20
  + rwaYieldRisk * 0.15
  + defiExposureStub * 0.05
```

Red-flag overrides are retained:

- active malicious approval can force `Critical`
- high approval / transfer / Mantle yield evidence can floor the level to `High`
- partial data can prevent an otherwise low scan from being treated as fully safe

Supplemental P2.3 risks, such as source coverage, stale data, wallet activity, high-value exposure, and token security, appear in `riskEngine.allRisks`. Coverage and stale-data risks reduce confidence and add unknowns; they do not create fake safety or force a critical level by themselves.

Weak evidence caps score impact:

- no evidence: rejected by evidence binding
- low confidence: score impact is capped
- partial/source-failed coverage: confidence is reduced

## Evidence Requirements

- Every top risk must have `evidenceIds`.
- Every `riskEngine.allRisks[]` item must also have evidence IDs.
- Every risk evidence ID must exist in `evidenceBundle.evidence`.
- Transfer evidence must include a tx hash.
- Approval evidence must include allowance confirmation.
- Source-coverage uncertainty uses explicit `source_coverage` evidence instead of unsupported claims.

## Source Uncertainty Behavior

Missing indexed approvals, transfers, inventory, or token security data is represented as:

- `PARTIAL_OR_UNKNOWN` data status
- source status `partial`, `unavailable`, `unknown`, or `source_failed`
- source coverage / wallet activity risk where applicable
- confidence reduction

Missing source data is never interpreted as safe.

## Safe Action Policy

Allowed action modes:

- `simulation_only`
- `view_only`

Allowed action types include:

- simulate revoke impact
- review spender
- mark counterparty suspicious
- inspect token
- rescan later
- check source coverage
- manual revoke only from the user wallet if supported

Server-side revoke execution, swaps, trades, and automatic signing remain out of scope.

## Verification

Commands:

```bash
python3 -m unittest tests.test_p2_risk_engine_hardening -v
REQUIRE_FULL_P1=true ./scripts/qa_provider_config_smoke.sh
./scripts/qa_all.sh
```

Observed result:

- P2.3 focused tests: PASS, 11 tests.
- Provider config smoke with `REQUIRE_FULL_P1=true`: PASS.
- Full QA: PASS, including lint, typecheck, unit, integration, frontend build, replay smoke, live smoke, and browser smoke prerequisites.
- Secret leak check on changed files: PASS.
- No real chain transaction was made during P2.3 tests or browser smoke.

Browser smoke checklist:

- Demo replay high-risk wallet scans successfully.
- Score, risk level, top risks, and score breakdown are visible.
- Top risks have evidence IDs and resolve to detail/evidence records.
- Suggested actions are simulation/view-only.
- Live Mantle Sepolia wallet scans successfully.
- Partial/unavailable indexed data is shown as unknown, not safe.
- No automatic commit, revoke, swap, trade, or signing happens during scan or page load.

Observed browser smoke:

- Demo high-risk replay: score/risk level, top-risk evidence, unknowns, and score breakdown visible.
- Live Mantle Sepolia wallet: scan completed with `PARTIAL_OR_UNKNOWN`; unknown/not-safe messaging visible; score breakdown visible; no automatic commit tx appeared.

## Known Caveats

- The frontend only shows minimal score breakdown and unknowns; no broad UI redesign was done in P2.3.
- The final score remains compatible with the existing weighted P0/P1 metrics, while supplemental P2.3 risks are exposed in `riskEngine.allRisks`.
- Moralis / Mantlescan coverage on Mantle Sepolia may be partial or unavailable for some wallets.
- GoPlus clean results remain advisory and never guarantee wallet safety.

## Remaining Before P2.4

- Decide whether P2.4 starts with trend/alerts or contract readback verification.
- Add richer risk drill-down UI only after the P2.3 backend contract is stable.
- Add longer-lived source telemetry once trend/alerts work begins.
