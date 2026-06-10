# P2.7B-1 Unknown Is Not Safe Presentation Layer

Status: implemented as a centralized presentation/copy layer.

## Goal

Make product language consistent across Overview, Evidence, History, On-chain Proof, and Advanced without scattering state-specific `if/else` copy across page components.

Core principle:

```text
Unknown is not safe.
```

## Shared Layer

Primary file:

- `frontend/app/src/presentation/assessmentCopy.ts`

Exported helpers:

- `getScoreDisplay(assessment)`
- `getRiskHeadline(assessment)`
- `getCoverageLabel(status, mode)`
- `getProofLabel(assessment, record, providerStatus)`
- `getRecordStatusLabel(record)`
- `getOutcomeLabel(record)`
- `getSimulationAvailability(assessment)`
- `getPrimaryNextStep(assessment, record, providerStatus)`
- `getSourceStatusGroups(sourceAvailability, scan)`
- `getCoverageWarningCopy(scan)`
- `getSafeDisclaimer(assessment)`
- `normalizeUserFacingLabel(value)`

## State Semantics

Risk score:

- Numeric severity score based on detected evidence-backed risk signals.
- If live data is partial and no direct risk evidence exists, the UI should show `Not enough data`, not `0 / 100` as a safety score.

Detected signals:

- Count of approval, transfer, yield, concentration, or source-coverage signals actually found.
- Source coverage warnings are not disguised as approval / transfer / yield evidence.

Data coverage:

- Full, partial, unavailable, or unknown fields present.
- Missing indexed data may hide older approvals, unknown tokens, or transfer history.
- Missing data is unknown, not safe.

Record status:

- Local draft
- Pending
- Recorded on Mantle
- Failed

Proof status:

- Replay proof only
- Not recorded on-chain yet
- Recorded on Mantle
- Verification matched / mismatch / unknown

Outcome:

- Pending review
- Unchanged
- Risk reduced in simulation
- Recorded
- Failed

Coverage is not used as outcome. Proof status is not used as wallet safety status.

## Proof Language

Demo replay:

- Label: `Replay proof only`
- Helper: demo replay does not create Mantle transaction proof.

Live before record:

- Label: `Not recorded on-chain yet`
- Helper: ready to record assessment hash.

Live after record:

- Label: `Recorded on Mantle`
- Helper: this proves the assessment hash, not wallet safety.

## Simulation Language

When actionable evidence exists:

- Label: `Simulate risk reduction`
- Explain before / after risk movement.
- State that no transaction is created or broadcast.

When actionable evidence is missing:

- Label: `Simulation unavailable`
- Reason: no active approval or yield concentration evidence was found in this scan.

## Source Coverage Language

Source coverage uses capability-aware grouping:

- Available
- Partial
- Unavailable

Mixed providers are split by capability. For example:

- `Moralis balances`
- `Moralis wallet history`

The UI should not show conflicting generic provider chips such as `Moralis: partial` and `Moralis: unavailable`.

Current source coverage headline:

```text
Comparable with caution
```

Body:

```text
Source availability is stable across recent scans, so trend comparison is allowed. Some indexed sources are still incomplete, so missing data is treated as unknown, not safe.
```

## Tests

Coverage:

- `tests/test_presentation_state_semantics.py`
- `tests/test_p2_6_demo_ux.py`

Important assertions:

- Partial live coverage does not render `0 / 100` as a safety score.
- Unknown coverage never renders as safe.
- Assessment hash copy says it proves the assessment hash, not wallet safety.
- Replay proof and on-chain proof use different labels.
- Coverage is not used as outcome.
- Simulation unavailable shows a reason.
- Source coverage groups are capability-aware.

## Safety Boundaries

This layer changes presentation and state semantics only.

It does not:

- execute revoke
- execute swap
- execute transfer
- auto-connect a wallet
- auto-send an on-chain transaction
- expose private keys, seed phrases, or raw `.env` values
