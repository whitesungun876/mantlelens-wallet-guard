# Day 2 Explanation Contract

## Role

The explanation layer turns a structured `WalletRiskAssessment` and evidence bundle into user-readable language. It does not score risk, invent labels, add APY claims, override hard rules, or recommend real trades.

## Input

```json
{
  "assessment": "WalletRiskAssessment",
  "evidence": ["Evidence"],
  "language": "en",
  "audience": "consumer_wallet_user",
  "maxTopRisks": 3
}
```

## Output

```json
{
  "assessmentId": "assessment_demo_high_001",
  "mode": "llm",
  "summary": "Your wallet has high risk because...",
  "riskExplanations": [
    {
      "riskId": "risk_approval_unknown_unlimited",
      "plainLanguage": "This token approval lets an unknown spender move a large amount of your USDT.",
      "evidenceIds": ["ev_high_approval_event", "ev_high_allowance_call"],
      "limitations": ["Approval scan covers known tokens and a bounded event window."]
    }
  ],
  "suggestedActions": [
    {
      "actionId": "act_sim_revoke_usdt",
      "plainLanguage": "Simulate how your risk score would change if this approval were revoked.",
      "executionMode": "simulation_only",
      "evidenceIds": ["ev_high_approval_event", "ev_high_allowance_call"]
    }
  ],
  "claimGuardPassed": true
}
```

## Claim Guard Rules

- Every explanation claim must reference one or more `evidenceIds`.
- A claim about a suspicious transfer must reference a tx hash evidence item.
- A claim about active approval risk must reference an allowance confirmation evidence item.
- A claim about RWA/yield risk must name the data source and limitation.
- CoinGecko or DeFiLlama price evidence cannot support APY, holder count, approval risk, or security labels.
- GoPlus clean result can be described only as "no issue found by GoPlus in this scan", not as safe.
- Missing or unavailable data must be framed as unknown or partial.
- Simulation must be described as a hypothetical before/after diff, not as a completed transaction.

## Forbidden Phrases

- guaranteed wallet safety
- production-grade security rating
- all risks detected
- complete wallet scan
- real revoke executed
- real swap executed
- clean GoPlus result means safe
- mETH is RWA

## Fallback

Use rule-based fallback when:

- LLM provider is unavailable.
- LLM latency exceeds 10 seconds.
- Claim guard fails.
- Explanation retries exceed 2.

Fallback template:

```text
Your wallet risk level is {riskLevel} with score {walletRiskScore}/100.
This is based on a {dataCoverage} scan, so unavailable indexed data is not treated as safe.
Top risk: {topRisk.claimText}
Evidence: {evidenceIds}
Suggested action: {action.label}. This is simulation-only in the MVP.
```

## Day 2 Acceptance

- Explanation input and output are structured.
- Claim guard rules are explicit.
- Rule fallback is available before LLM integration.
