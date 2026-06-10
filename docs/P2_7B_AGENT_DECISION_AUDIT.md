# P2.7B-3 Agent Decision Audit

## Goal

Show judges that MantleLens is an evidence-first safety workflow, not a free-form LLM wrapper. The audit layer explains how evidence, hard rules, decision type, action type, and LLM explanation fit together.

This pass is intentionally presentation-only:

- no risk-engine changes
- no P2.7A live demo wallet/proof changes
- no revoke, swap, transfer, auto-signing, or private-key handling
- no new top-level page
- no Overview rule tree

## Product Placement

- Evidence: lightweight `Decision Audit` card after risk evidence and before supporting records.
- Advanced: full decision audit with raw decision/action types, evidence IDs/hashes, triggered rules, blocked actions, allowed actions, and LLM boundary.
- Overview: remains product-facing and is not turned back into an engineering console.

## Shared Copy Layer

Decision Audit copy is centralized in:

```text
frontend/app/src/presentation/assessmentCopy.ts
```

Key helpers:

- `getDecisionAudit(assessment, scan)`
- `getDecisionLabel(decisionType)`
- `getActionLabel(actionType)`
- `getDecisionReasons(assessment, scan)`
- `getHardRules(assessment, scan)`
- `getBlockedActions()`
- `getAllowedActions(assessment, scan, actionType)`

## Decision Mapping

| Scenario | Decision | Action | Notes |
| --- | --- | --- | --- |
| High-risk approval / multi-signal demo | `REVIEW_APPROVAL` | `SIMULATE_REVOKE_APPROVAL` | Active approval evidence leads to review and simulation, not execution. |
| Live partial coverage only | `RECORD_ASSESSMENT_ONLY` | `CHECK_SOURCE_COVERAGE` | Missing indexed data is unknown, not safe. |
| Critical red flag | `PAUSE` | `REVIEW_APPROVAL` | Hard red flag blocks forward action until review. |
| Low-risk with sufficient coverage | `WATCH` | `WATCH` | Quiet / insufficient data does not become safe. |

## Hard Rules

- Evidence before explanation.
- Unknown spender is not safe.
- Missing indexed data is unknown, not safe.
- Real execution is blocked.
- Assessment proof verifies the assessment record, not wallet safety.

## Blocked Actions

- Real revoke
- Swap
- Transfer
- Auto-signing
- Private-key custody
- LLM-generated transaction execution

## Allowed Actions

- Inspect evidence
- Simulate risk reduction
- Record assessment hash
- Verify assessment
- Check source coverage

## LLM Boundary

Rules and evidence run before LLM explanation. LLM explains findings; it does not execute transactions or override hard rules.

## Verification

Commands:

```bash
python3 -m unittest tests.test_p2_7b_agent_decision_audit -v
python3 -m unittest tests.test_presentation_state_semantics -v
python3 -m unittest tests.test_p2_7b_mantle_native_signals -v
cd frontend/app && npm run typecheck
cd frontend/app && npm run build
./scripts/qa_all.sh
```

## P2.7A Preservation

P2.7A live proof remains unchanged:

- Mantle Sepolia is still the live proof chain.
- AssessmentLogger and `AssessmentRecorded` copy remain intact.
- Verify proof remains read-only.
- Recording remains explicit and manual.
