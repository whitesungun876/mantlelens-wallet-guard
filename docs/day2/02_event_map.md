# Day 2 Event Map

## Global Event Properties

Every event must include:

| Property | Type | Required | Notes |
|---|---|---|---|
| `eventName` | string | yes | Stable snake_case name |
| `eventVersion` | string | yes | Start at `1.0` |
| `eventId` | string | yes | UUID or deterministic test id |
| `occurredAt` | datetime | yes | ISO 8601 |
| `runId` | string | yes | Agent run id |
| `traceId` | string | yes | Trace id propagated across API calls |
| `assessmentId` | string | no | Required after assessment creation |
| `walletHash` | string | yes | Never use wallet address as analytics key |
| `chainId` | number | yes | Must be `5000` |
| `dataMode` | string | yes | `live`, `demo`, or `replay` |
| `state` | string | yes | Current agent state |

## Event Catalog

| Event | Trigger | Extra Properties | Owner | Acceptance |
|---|---|---|---|---|
| `wallet_input_submitted` | User pastes or connects wallet | `inputMode`, `isValid` | FE | Invalid address does not start scan |
| `scan_started` | `/api/wallet/scan` accepted | `blockWindow`, `scanMode` | BE | Has runId and traceId |
| `source_checked` | Source availability checked | `sourceName`, `sourceStatus`, `limitation` | BE | Unavailable sources are logged |
| `tool_call_started` | Tool call begins | `toolName`, `toolVersion`, `sideEffectLevel` | BE | State-changing tool flagged |
| `tool_call_completed` | Tool call completes | `toolName`, `durationMs`, `sourceStatus` | BE | Partial output is explicit |
| `tool_call_blocked` | Policy blocks tool | `toolName`, `policyName`, `reason` | BE | Real revoke/trade blocked |
| `risk_evaluation_completed` | Risk engine returns assessment | `walletRiskScore`, `riskLevel`, `dataConfidence`, `redFlags` | BE | No LLM fields in scoring event |
| `evidence_bundle_built` | Evidence hash generated | `evidenceCount`, `evidenceBundleHash`, `orphanClaimCount` | BE | `orphanClaimCount = 0` |
| `explanation_requested` | Explanation workflow starts | `modeRequested`, `topRiskCount` | BE/AI | Assessment exists first |
| `explanation_completed` | Explanation returned | `mode`, `claimGuardPassed`, `fallbackReason` | AI | Guard failure triggers fallback |
| `simulation_started` | User requests simulation | `simulationType`, `actionType` | FE/BE | Execution mode is simulation-only |
| `simulation_completed` | Simulation diff returned | `simulationType`, `beforeScore`, `afterScore`, `scoreDelta` | BE | No transaction id is emitted |
| `assessment_commit_requested` | User requests record | `assessmentHash`, `idempotencyKeyPresent` | FE/BE | Missing idempotency key rejected |
| `assessment_commit_status_changed` | Commit updates | `status`, `assessmentTx`, `retryCount` | BE | Failure becomes pending_retry |
| `benchmark_history_viewed` | User opens history | `recordCount` | FE | Wallet hash only |
| `evidence_drawer_opened` | User opens evidence | `riskId`, `evidenceId` | FE | Evidence id exists in bundle |
| `agent_state_changed` | Any state transition | `fromState`, `toState`, `policyDecision` | BE | All workflow states traceable |
| `replay_started` | Replay fixture loaded | `fixtureId`, `replayHash` | FE/BE | Deterministic assessment hash |

## KPI Queries

| KPI | Formula |
|---|---|
| P0 demo path completion | `assessment_commit_status_changed(status in recorded,pending_unavailable) / scan_started` |
| Partial scan visibility | `source_checked(status != available) -> UI data coverage shown` |
| Evidence grounding | `evidence_bundle_built.orphanClaimCount = 0` |
| LLM safety | `explanation_completed.claimGuardPassed = true OR mode = rule_fallback` |
| Simulation safety | `simulation_completed` has no transaction id and `executionMode = simulation_only` |

## Day 2 Acceptance

- Core events cover scan, evaluate, evidence, explain, simulate, commit, replay, and history.
- Every core event includes `runId` and `traceId`.
- Wallet analytics use `walletHash`, not raw address.
