# Day 5 Workflow Trace

## Goal

Day 5 turns the raw adapters and risk kernel into a deterministic backend workflow that produces:

- `assessment`
- `evidenceBundle`
- `explanation`
- `coverage`
- `trace`

This is the API-ready package for `/api/wallet/scan`.

## Code

| File | Purpose |
|---|---|
| `backend/mantlelens/workflows.py` | Runs Scan, Assessment, Evidence, Explanation workflow sequence |
| `backend/mantlelens/trace.py` | Records state transitions, tool calls, policy decisions, and durations |
| `backend/mantlelens/explain.py` | Provides rule-based explanation fallback |

## Workflow Sequence

```text
INIT
-> DATA_GATHERING
-> PARTIAL_OR_UNKNOWN
-> RISK_EVALUATING
-> EVIDENCE_BINDING
-> EXPLAINING
-> SIMULATION_READY
```

For full-data scans, `PARTIAL_OR_UNKNOWN` can be skipped. All current P0 fixtures include known-token or indexed-data limitations, so they correctly pass through `PARTIAL_OR_UNKNOWN`.

## Trace Events

The trace contains:

- `agent_state_changed`
- `tool_call_completed`
- `risk_evaluation_completed`
- `evidence_bundle_built`
- `explanation_completed`
- `policy_event` for guard checks

Every event includes:

- `runId`
- `traceId`
- `fromState`
- `toState`
- `policyDecision`
- `toolName` or `workflowName`
- `durationMs` when applicable
- `createdAt`

## Day 5 Acceptance

- `WalletGuardRunner.scan_wallet()` returns assessment, trace, coverage, and fallback explanation.
- `/api/wallet/scan` can wrap the workflow output directly.
- Explanation happens after risk and evidence binding.
- Current high-risk fixture returns `High`, `PARTIAL_OR_UNKNOWN`, and top risks: approval, transfer, RWA/yield.
