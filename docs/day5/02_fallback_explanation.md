# Day 5 Rule Fallback Explanation

## Goal

Provide deterministic explanation output before LLM integration. This protects the demo and preserves the rule that LLMs explain only; they do not score, invent evidence, or override rules.

## Code

`backend/mantlelens/explain.py`

## Output Shape

```json
{
  "assessmentId": "assessment_high_risk_wallet",
  "mode": "rule_fallback",
  "explanation": "Your wallet risk level is High...",
  "claims": [
    {
      "claimText": "USDT has an active unlimited approval...",
      "evidenceIds": ["ev_high_unlimited_approval", "ev_high_usdt_balance"]
    }
  ],
  "claimGuardPassed": true,
  "fallbackReason": "Day 5 deterministic fallback before LLM integration"
}
```

## Guardrails

- Every explanation claim is copied from structured `topRisks`.
- Every claim keeps its `evidenceIds`.
- Missing indexed data is described as unknown or partial.
- Suggested actions are labeled `view-only` or `simulation-only`.
- No real revoke, swap, trade, APY claim, or guaranteed-safety wording is generated.

## Day 5 Acceptance

- Fallback explanation is available without model credentials.
- `claimGuardPassed = true`.
- Explanation references evidence ids for every claim.
