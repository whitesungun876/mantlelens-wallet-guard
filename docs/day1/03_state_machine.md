# Day 1 Agent State Machine

## Principle

The agent is a policy-bounded orchestrator. It can choose the next workflow, but risk scoring, evidence binding, simulation diff, and assessment hash are produced by deterministic modules.

## States

```mermaid
stateDiagram-v2
  [*] --> INIT
  INIT --> DATA_GATHERING: valid wallet input
  INIT --> FAILED_RETRYABLE: invalid input

  DATA_GATHERING --> RISK_EVALUATING: minimum scan package ready
  DATA_GATHERING --> PARTIAL_OR_UNKNOWN: source unavailable or known-token-only
  DATA_GATHERING --> FAILED_RETRYABLE: retryable adapter failure

  PARTIAL_OR_UNKNOWN --> RISK_EVALUATING: partial assessment allowed
  PARTIAL_OR_UNKNOWN --> EXPLAINING: rule-only partial explanation

  RISK_EVALUATING --> EVIDENCE_BINDING: subScores + top risks ready
  RISK_EVALUATING --> FAILED_RETRYABLE: rule engine error

  EVIDENCE_BINDING --> EXPLAINING: every claim has evidenceId
  EVIDENCE_BINDING --> PARTIAL_OR_UNKNOWN: missing critical evidence

  EXPLAINING --> SIMULATION_READY: explanation or fallback ready
  EXPLAINING --> SIMULATION_READY: llm failure + rule fallback

  SIMULATION_READY --> SIMULATING: user requests simulation
  SIMULATION_READY --> READY_TO_COMMIT: user skips simulation

  SIMULATING --> READY_TO_COMMIT: simulation diff ready
  SIMULATING --> FAILED_RETRYABLE: simulation error

  READY_TO_COMMIT --> COMMIT_PENDING: user confirms record assessment
  READY_TO_COMMIT --> [*]: user exits

  COMMIT_PENDING --> COMMITTED: assessment hash recorded
  COMMIT_PENDING --> PENDING_RETRY: commit failed but idempotent retry allowed
  PENDING_RETRY --> COMMITTED: retry succeeds
  PENDING_RETRY --> FAILED_RETRYABLE: retry budget exhausted

  COMMITTED --> BENCHMARK_UPDATED: benchmark record persisted
  BENCHMARK_UPDATED --> [*]
```

## Transition Guards

| From | To | Guard |
|---|---|---|
| `INIT` | `DATA_GATHERING` | Wallet address matches `0x[a-fA-F0-9]{40}` and `chainId = 5000` |
| `DATA_GATHERING` | `RISK_EVALUATING` | Native balance and at least one known-token or transfer source status is available |
| `DATA_GATHERING` | `PARTIAL_OR_UNKNOWN` | Full inventory, indexed history, or source label is unavailable |
| `RISK_EVALUATING` | `EVIDENCE_BINDING` | White-box engine returns subScores, topRisks, decisionType, and actionType |
| `EVIDENCE_BINDING` | `EXPLAINING` | Every top risk and suggested action has at least one `evidenceId` |
| `EXPLAINING` | `SIMULATION_READY` | LLM claim guard passes, or rule fallback is generated |
| `SIMULATION_READY` | `SIMULATING` | Requested action is simulation-only |
| `READY_TO_COMMIT` | `COMMIT_PENDING` | User confirms record action, `assessmentHash` exists, and `idempotencyKey` exists |
| `COMMIT_PENDING` | `COMMITTED` | Ledger adapter returns a real tx or an explicit unavailable status |

## Policy Guardrails

- One run has at most 10 agent steps.
- Same tool with the same arguments may run at most 2 times.
- Explanation retries are capped at 2.
- LLM output is rejected if it contains claims without evidence ids.
- Missing data cannot transition to a "safe" claim.
- State-changing tools require a confirmation event, trace id, and idempotency key.
- P0 state-changing tools only record assessment or outcome hashes. They do not revoke, swap, or trade.

## Required Trace Fields

Every transition writes:

- `runId`
- `traceId`
- `assessmentId` if available
- `fromState`
- `toState`
- `trigger`
- `policyDecision`
- `toolName` if applicable
- `durationMs`
- `createdAt`

## Day 1 Acceptance

- State flow contains `PARTIAL_OR_UNKNOWN`, `FAILED_RETRYABLE`, `COMMIT_PENDING`, and `COMMITTED`.
- Explanation cannot happen before risk and evidence are available.
- Commit cannot happen before assessment hash and policy confirmation.
- There is no path to real revoke, swap, or trade execution.
