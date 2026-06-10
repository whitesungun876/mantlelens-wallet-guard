# Day 6 Policy Engine

## Goal

Day 6 adds explicit Agent policy checks for state transitions, tool permissions, repeated calls, and commit guardrails.

## Code

`backend/mantlelens/policy.py`

## Implemented Guards

| Guard | Behavior |
|---|---|
| State transition guard | Blocks transitions not in the Day 1 state machine |
| Step budget | Blocks after 10 state transitions |
| Repeat-call guard | Same tool + same argument hash allowed at most 2 times |
| Real execution guard | Blocks `revokeApproval`, `swapToken`, `executeTrade`, `transferAsset` |
| State-changing guard | `commitAssessment` and `recordOutcome` require valid state, confirmation, and idempotency key |
| Unknown tool guard | Blocks tools not in registry |

## Tool Classes

| Class | Tools |
|---|---|
| Read-only | `getNativeBalance`, `getKnownTokenBalances`, `getTokenApprovals`, `confirmActiveAllowance`, `getSpenderLabels`, `getTransactionCount`, `getTransferLogs`, `getTokenPrices`, `getTokenSecurity`, `getRwaYieldExposure` |
| Analytical | `evaluateWalletRisk`, `buildEvidenceBundle`, `explainAssessment` |
| State-changing hash record | `commitAssessment`, `recordOutcome` |
| Forbidden real execution | `revokeApproval`, `swapToken`, `executeTrade`, `transferAsset` |

## Commit Check

The local API exposes a Day 6 policy check endpoint:

```http
POST /api/policy/commit-check
```

Required body:

```json
{
  "assessmentHash": "0xabc",
  "confirmationReceived": true,
  "idempotencyKey": "idem_1"
}
```

## Day 6 Acceptance

- Step/repeat guard is tested.
- Real execution tools are blocked.
- Commit requires confirmation and idempotency key.
- Policy events are visible in trace output.
